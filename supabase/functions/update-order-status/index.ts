import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken, shiftAuthCorsHeaders } from "../_shared/verify-shift-token.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";
import { z } from "npm:zod@3.23.8";

const corsHeaders = shiftAuthCorsHeaders();
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BodySchema = z.object({
  id: z.string().uuid("id duhet të jetë UUID"),
  status: z.enum(["accepted", "rejected"]),
}).passthrough(); // allow x-shift-token siblings

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({ key: clientKey(req, "update-order-status"), max: 120, windowMs: 60_000, blockMs: 60_000 });
  if (!rl.ok) return json({ error: "Shumë kërkesa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;

    // Alternative auth: internal shared secret (used by Telegram callback flow)
    const internal = req.headers.get("x-internal-secret");
    const expectedInternal = Deno.env.get("INTERNAL_WEBHOOK_SECRET") || "";
    const internalAuthorized = !!internal && !!expectedInternal && internal === expectedInternal;

    if (!internalAuthorized) {
      const auth = await requireShiftToken(req, body);
      if (!auth.ok) return auth.response;
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Të dhëna të pavlefshme", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { id, status } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("orders")
      .update({ status, completed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: "Porosia nuk u gjet ose nuk është pending" }, 404);

    // Nëse porosia u pranua → dërgo në Bar KDS (kërko konfirmim banakieri),
    // njësoj si porositë e krijuara nga POS. Kjo NUK duhet anashkaluar.
    if (status === "accepted") {
      try {
        const orderRow: any = data;
        const rawItems: any[] = Array.isArray(orderRow.items) ? orderRow.items : [];
        const productIds = rawItems
          .map((i: any) => i?.productId || i?.id)
          .filter((x: any) => typeof x === "string");

        if (productIds.length > 0) {
          const { data: menuItems } = await supabase
            .from("menu_items")
            .select("id, name, price, for_bar, for_kitchen, offer_price, offer_start_time, offer_end_time")
            .in("id", productIds);
          const menuMap = new Map((menuItems ?? []).map((m: any) => [m.id, m]));

          const nowRome = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });
          const activePrice = (m: any): number => {
            if (!m.offer_price || !m.offer_start_time || !m.offer_end_time) return Number(m.price);
            const s = String(m.offer_start_time).slice(0, 5);
            const e = String(m.offer_end_time).slice(0, 5);
            const active = s > e ? (nowRome >= s || nowRome <= e) : (nowRome >= s && nowRome <= e);
            return active ? Number(m.offer_price) : Number(m.price);
          };

          const enriched = rawItems
            .map((ci: any) => {
              const pid = ci?.productId || ci?.id;
              const m: any = menuMap.get(pid);
              if (!m) return null;
              return {
                productId: pid,
                name: m.name,
                price: activePrice(m),
                quantity: Number(ci?.quantity || 1),
                notes: ci?.notes || "",
                forBar: m.for_bar ?? true,
                forKitchen: m.for_kitchen ?? false,
              };
            })
            .filter(Boolean) as any[];

          if (enriched.length > 0) {
            const totalAmount = enriched.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
            // Route ALL accepted client orders to the virtual "Porosi Online" table (#0)
            // so they show up individually in POS and are exempt from normal table rules.
            const originalTableNumber = orderRow.table_number ? Number(orderRow.table_number) : null;
            const { data: onlineT } = await supabase
              .from("tables").select("id").eq("number", 0).maybeSingle();
            const onlineTableId: string | null = (onlineT as any)?.id ?? null;

            const clientLabel = originalTableNumber
              ? `Klient · Tavolina #${originalTableNumber}`
              : `Klient · Takeaway`;

            const { data: posOrder, error: posErr } = await supabase
              .from("pos_orders")
              .insert({
                table_id: onlineTableId,
                table_number: 0,
                mode: "table",
                items: enriched,
                status: "open",
                total_amount: totalAmount,
                operator_name: null,
                notes: `${clientLabel} (Ref: ${orderRow.id})`,
                source: "client",
              })
              .select()
              .single();

            if (!posErr && posOrder) {
              const barItems = enriched.filter((i) => i.forBar);
              const kitchenItems = enriched.filter((i) => i.forKitchen);
              const splits: any[] = [];
              if (barItems.length > 0) splits.push({ order_id: posOrder.id, type: "bar", items: barItems, status: "pending" });
              if (kitchenItems.length > 0) splits.push({ order_id: posOrder.id, type: "kitchen", items: kitchenItems, status: "pending" });
              if (splits.length > 0) await supabase.from("order_items_split").insert(splits);
            } else if (posErr) {
              console.error("pos_orders insert failed:", posErr);
            }
          }
        }
      } catch (routeErr) {
        console.error("Route to Bar KDS failed:", routeErr);
      }
    }

    return json({ success: true, order: data });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});