import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const LINE_WIDTH = 42;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function center(text: string) {
  const pad = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
  return " ".repeat(pad) + text;
}
function line(char = "-") { return char.repeat(LINE_WIDTH); }
function row(left: string, right: string) {
  const space = Math.max(1, LINE_WIDTH - left.length - right.length);
  return left + " ".repeat(space) + right;
}
function buildReceiptText(order: any) {
  const rows: string[] = [];
  rows.push(center("BOULEVARD CAFE"));
  rows.push(center(order.table_number ? `Tavolina ${order.table_number}` : String(order.mode).toUpperCase()));
  rows.push(line());
  rows.push(new Date(order.created_at).toLocaleString("sq-AL"));
  rows.push(line());
  for (const item of order.items ?? []) {
    const qty = item.quantity;
    const price = Number(item.price);
    const lineTotal = (qty * price).toFixed(0);
    rows.push(row(`${item.name} x${qty}`, `${lineTotal} L`));
    if (item.notes) rows.push(`  (${item.notes})`);
  }
  rows.push(line());
  rows.push(row("TOTALI", `${Number(order.total_amount).toFixed(0)} L`));
  rows.push(line());
  rows.push(center("Faleminderit!"));
  return rows.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { orderId, closeOrder = false, operatorName = null } = await req.json();
    if (!orderId) return jsonResponse({ error: "Mungon orderId" }, 400);

    const { data: order, error: orderErr } = await supabase
      .from("pos_orders").select("*").eq("id", orderId).single();
    if (orderErr || !order) return jsonResponse({ error: "Porosia nuk u gjet" }, 404);

    if (closeOrder) {
      if (!operatorName) return jsonResponse({ error: "operatorName kërkohet për të mbyllur porosinë" }, 400);
      const { data: txn, error: closeErr } = await supabase.rpc("close_pos_order", {
        p_order_id: orderId, p_operator_name: operatorName,
      });
      if (closeErr) return jsonResponse({ error: closeErr.message }, 500);
      await supabase.from("pos_orders").update({ printed_at: new Date().toISOString() }).eq("id", orderId);
      return jsonResponse({ receiptText: buildReceiptText(order), transaction: txn, closed: true });
    }

    await supabase.from("pos_orders").update({ printed_at: new Date().toISOString() }).eq("id", orderId);
    return jsonResponse({ receiptText: buildReceiptText(order), closed: false });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});