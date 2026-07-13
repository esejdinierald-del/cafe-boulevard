import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";

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
  try {
    const parsedBody = await req.json();
    const auth = await requireShiftToken(req, parsedBody);
    if (!auth.ok) return auth.response;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { orderId, itemIndex, adminPassword, mode } = parsedBody;
    if (!adminPassword) return json({ error: "Fjalëkalim i pasaktë" }, 403);
    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
    const expectedHash = setting?.value;
    if (!expectedHash) return json({ error: "Admin passcode nuk është konfiguruar" }, 500);
    const providedHash = await sha256(String(adminPassword));
    if (providedHash !== expectedHash) {
      return json({ error: "Fjalëkalim i pasaktë" }, 403);
    }
    if (!orderId) return json({ error: "Mungon orderId" }, 400);

    const { data: order, error: orderErr } = await supabase
      .from("pos_orders").select("id, items, table_id, status").eq("id", orderId).single();
    if (orderErr || !order) return json({ error: "Porosia nuk u gjet" }, 404);
    if (order.status === "closed") return json({ error: "Porosia është mbyllur" }, 400);

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

    const newItems = items
      .map((it, i) => (i === itemIndex ? { ...it, quantity: it.quantity - 1 } : it))
      .filter((it) => it.quantity > 0);

    // If order becomes empty → cancel entire order
    if (newItems.length === 0) {
      await supabase.from("order_items_split").delete().eq("order_id", orderId);
      await supabase.from("pos_orders").delete().eq("id", orderId);
      if (order.table_id) {
        await supabase.from("tables").update({ status: "available" }).eq("id", order.table_id);
      }
      return json({ success: true, cancelledOrder: true });
    }

    const newTotal = newItems.reduce(
      (s: number, it: any) => s + Number(it.price) * it.quantity,
      0,
    );

    const { error: updErr } = await supabase
      .from("pos_orders")
      .update({ items: newItems, total_amount: newTotal })
      .eq("id", orderId);
    if (updErr) return json({ error: updErr.message }, 500);

    // Rebuild splits (bar/kitchen) atomically
    const { data: splits } = await supabase
      .from("order_items_split").select("id, type").eq("order_id", orderId);

    for (const sp of (splits ?? []) as any[]) {
      const filtered = newItems.filter((it: any) =>
        sp.type === "bar" ? it.forBar !== false : it.forKitchen === true,
      );
      if (filtered.length === 0) {
        await supabase.from("order_items_split").delete().eq("id", sp.id);
      } else {
        await supabase.from("order_items_split").update({ items: filtered }).eq("id", sp.id);
      }
    }

    return json({ success: true, cancelledOrder: false });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});