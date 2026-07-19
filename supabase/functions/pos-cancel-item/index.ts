import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";
import { verifyStaffAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shift-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({ key: clientKey(req, "pos-cancel-item"), max: 10, windowMs: 5 * 60_000, blockMs: 15 * 60_000 });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const parsedBody = await req.json();
    const auth = await requireShiftToken(req, parsedBody);
    if (!auth.ok) return auth.response;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { orderId, itemIndex, adminStaffId, adminName, adminPassword, mode, qty: qtyRaw } = parsedBody;
    const va = await verifyStaffAdmin(supabase, { staffId: adminStaffId, staffName: adminName, password: adminPassword });
    if (!va.ok) return json({ error: va.error }, va.status);
    if (!orderId) return json({ error: "Mungon orderId" }, 400);

    const { data: order, error: orderErr } = await supabase
      .from("pos_orders").select("id, items, table_id, status, created_at").eq("id", orderId).single();
    if (orderErr || !order) return json({ error: "Porosia nuk u gjet" }, 404);
    if (order.status === "closed") return json({ error: "Porosia është mbyllur" }, 400);

    // Block cancellations when the ORIGINAL shift turn of the order is locked
    const { data: lockedFlag, error: lockErr } = await supabase.rpc("is_order_turn_locked", { p_order_id: orderId });
    if (lockErr) return json({ error: lockErr.message }, 500);
    if (lockedFlag === true) {
      return json({ error: "Turni origjinal i porosisë është i mbyllur — anullimi nuk lejohet. Kontakto adminin për ripërhapje." }, 409);
    }

    const items: any[] = Array.isArray(order.items) ? order.items : [];

    // FULL ORDER CANCEL
    if (mode === "order") {
      await supabase.from("order_items_split").delete().eq("order_id", orderId);
      const { error: delErr } = await supabase.from("pos_orders").delete().eq("id", orderId);
      if (delErr) return json({ error: delErr.message }, 500);
      if (order.table_id) {
        await supabase.from("tables").update({ status: "available" }).eq("id", order.table_id);
      }
      return json({ success: true, cancelledOrder: true });
    }

    // SINGLE ITEM DECREMENT
    if (typeof itemIndex !== "number" || itemIndex < 0 || itemIndex >= items.length) {
      return json({ error: "Index i pavlefshëm" }, 400);
    }

    const target = items[itemIndex];
    if (!target || target.cancelled) return json({ error: "Artikull i pavlefshëm" }, 400);
    const qty = Math.max(1, Math.floor(Number(qtyRaw ?? 1)));

    // Net available qty for this product line (name+price), taking prior adjustments into account
    const netAvailable = items.reduce((s: number, it: any) => {
      if (it.name === target.name && Number(it.price) === Number(target.price)) {
        return s + Number(it.quantity || 0);
      }
      return s;
    }, 0);
    if (qty > netAvailable) {
      return json({ error: `Mund të anullohen maksimumi ${netAvailable} copë` }, 400);
    }

    // Append a NEGATIVE adjustment line (keeps original line visible on the bill)
    const adjustment = {
      ...target,
      quantity: -qty,
      cancelled: true,
      notes: "anulim",
    };
    const newItems = [...items, adjustment];

    const newTotal = newItems.reduce(
      (s: number, it: any) => s + Number(it.price) * Number(it.quantity || 0),
      0,
    );

    const { error: updErr } = await supabase
      .from("pos_orders")
      .update({ items: newItems, total_amount: newTotal })
      .eq("id", orderId);
    if (updErr) return json({ error: updErr.message }, 500);

    // Fiscal reversal: restore raw_materials via recipes, decrement shirit,
    // and register a `void` transaction so daily sales tape stays accurate.
    if (target?.productId) {
      const { error: voidErr } = await supabase.rpc("void_pos_item", {
        p_order_id: orderId,
        p_product_id: target.productId,
        p_qty: qty,
        p_price: Number(target.price) || 0,
        p_operator: va.admin?.name ?? "admin",
      });
      if (voidErr) console.error("void_pos_item failed:", voidErr);
    }

    return json({ success: true, cancelledOrder: false, qty, newTotal });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});