// supabase/functions/pos-create-order/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const { tableNumber, mode = "table", items: cartItems, notes = null, locationId = null, operatorName = null } = body ?? {};

    if (!Array.isArray(cartItems) || cartItems.length === 0) return jsonResponse({ error: "Shporta është bosh" }, 400);
    if (!["table", "bar", "delivery", "takeaway"].includes(mode)) return jsonResponse({ error: "Mode i panjohur" }, 400);
    for (const ci of cartItems) {
      if (!ci.productId || typeof ci.quantity !== "number" || ci.quantity <= 0) {
        return jsonResponse({ error: "Artikull i pavlefshëm në shportë" }, 400);
      }
    }

    let tableId: string | null = null;
    if (mode === "table") {
      if (!tableNumber) return jsonResponse({ error: "Mungon numri i tavolinës" }, 400);
      const { data: table, error: tableErr } = await supabase
        .from("tables").select("id, status").eq("number", tableNumber).single();
      if (tableErr || !table) return jsonResponse({ error: "Tavolina nuk u gjet" }, 404);
      tableId = table.id;
    }

    const productIds = cartItems.map((i: any) => i.productId);
    const { data: menuItems, error: menuErr } = await supabase
      .from("menu_items")
      .select("id, name, price, for_bar, for_kitchen, is_active, offer_price, offer_start_time, offer_end_time")
      .in("id", productIds);
    if (menuErr) return jsonResponse({ error: menuErr.message }, 500);

    const menuMap = new Map((menuItems ?? []).map((m: any) => [m.id, m]));
    for (const ci of cartItems) {
      const m = menuMap.get(ci.productId);
      if (!m || m.is_active === false) return jsonResponse({ error: `Produkti ${ci.productId} nuk është i disponueshëm` }, 400);
    }

    const nowRome = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });
    const activePrice = (m: any): number => {
      if (!m.offer_price || !m.offer_start_time || !m.offer_end_time) return Number(m.price);
      const s = String(m.offer_start_time).slice(0, 5);
      const e = String(m.offer_end_time).slice(0, 5);
      const active = s > e ? (nowRome >= s || nowRome <= e) : (nowRome >= s && nowRome <= e);
      return active ? Number(m.offer_price) : Number(m.price);
    };

    const enrichedItems = cartItems.map((ci: any) => {
      const m: any = menuMap.get(ci.productId);
      return {
        productId: ci.productId,
        name: m.name,
        price: activePrice(m),
        quantity: ci.quantity,
        notes: ci.notes || "",
        forBar: m.for_bar ?? true,
        forKitchen: m.for_kitchen ?? false,
      };
    });

    const totalAmount = enrichedItems.reduce((sum: number, i: any) => sum + Number(i.price) * i.quantity, 0);

    const insertPayload: Record<string, unknown> = {
      table_id: tableId,
      table_number: mode === "table" ? tableNumber : null,
      mode,
      items: enrichedItems,
      status: "open",
      total_amount: totalAmount,
      operator_name: operatorName,
      notes,
    };
    // location_id is a UUID column — only include if a valid UUID was passed
    if (typeof locationId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationId)) {
      insertPayload.location_id = locationId;
    }
    const { data: order, error: orderErr } = await supabase
      .from("pos_orders").insert(insertPayload).select().single();
    if (orderErr) {
      console.error("pos_orders insert failed:", orderErr);
      return jsonResponse({ error: orderErr.message }, 500);
    }

    const barItems = enrichedItems.filter((i: any) => i.forBar);
    const kitchenItems = enrichedItems.filter((i: any) => i.forKitchen);
    const splits: any[] = [];
    if (barItems.length > 0) splits.push({ order_id: order.id, type: "bar", items: barItems, status: "pending" });
    if (kitchenItems.length > 0) splits.push({ order_id: order.id, type: "kitchen", items: kitchenItems, status: "pending" });

    if (splits.length > 0) {
      const { error: splitErr } = await supabase.from("order_items_split").insert(splits);
      if (splitErr) {
        await supabase.from("pos_orders").delete().eq("id", order.id);
        return jsonResponse({ error: splitErr.message }, 500);
      }
    }

    if (tableId) await supabase.from("tables").update({ status: "occupied" }).eq("id", tableId);

    return jsonResponse({ order, splits: splits.length });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});