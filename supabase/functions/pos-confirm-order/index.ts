import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { splitId } = await req.json();
    if (!splitId) return jsonResponse({ error: "Mungon splitId" }, 400);

    const { data: split, error: splitErr } = await supabase
      .from("order_items_split").select("id, order_id, status").eq("id", splitId).single();
    if (splitErr || !split) return jsonResponse({ error: "Split-i nuk u gjet" }, 404);
    if (split.status === "confirmed") return jsonResponse({ error: "Ky split është konfirmuar tashmë" }, 400);

    const { error: updateErr } = await supabase.from("order_items_split")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", splitId);
    if (updateErr) return jsonResponse({ error: updateErr.message }, 500);

    const { data: siblings, error: siblingsErr } = await supabase
      .from("order_items_split").select("status").eq("order_id", split.order_id);
    if (siblingsErr) return jsonResponse({ error: siblingsErr.message }, 500);

    const allConfirmed = (siblings ?? []).every((s: any) => s.status === "confirmed");
    if (allConfirmed) {
      await supabase.from("pos_orders").update({ status: "ready" }).eq("id", split.order_id).neq("status", "closed");

      // Decrement raw materials based on recipes (once, when the whole order is ready)
      try {
        const { data: order } = await supabase
          .from("pos_orders").select("items").eq("id", split.order_id).single();
        const items: any[] = Array.isArray((order as any)?.items) ? (order as any).items : [];
        const productIds = items.map((i) => i.productId).filter(Boolean);
        if (productIds.length > 0) {
          const { data: recipes } = await supabase
            .from("recipes")
            .select("menu_item_id, material_id, quantity_needed")
            .in("menu_item_id", productIds);
          for (const it of items) {
            const rs = (recipes ?? []).filter((r: any) => r.menu_item_id === it.productId);
            for (const r of rs as any[]) {
              const amount = Number(r.quantity_needed) * Number(it.quantity);
              if (amount > 0) {
                await supabase.rpc("decrement_material", {
                  material_id: r.material_id,
                  amount,
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("decrement_material failed", (e as Error).message);
      }
    }

    return jsonResponse({ success: true, orderReady: allConfirmed });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});