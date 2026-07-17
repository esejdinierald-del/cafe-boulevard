// Multi-action reader for staff pages. All actions are guarded by
// requireShiftToken() and executed with service_role, so they bypass RLS
// safely: only holders of an active shift token (POS/inventory/kitchen)
// can call them.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shift-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireShiftToken(req, body);
    if (!auth.ok) return auth.response;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const action = String(body.action || "");

    switch (action) {
      case "pos_orders.open_all": {
        const { data, error } = await supabase
          .from("pos_orders")
          .select("id, table_number, total_amount, status")
          .in("status", ["open", "ready"]);
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "pos_orders.by_table": {
        const tableNumber = Number(body.tableNumber);
        if (!tableNumber) return json({ error: "tableNumber i pavlefshëm" }, 400);
        const { data, error } = await supabase
          .from("pos_orders")
          .select("id, status, total_amount, created_at, operator_name, items")
          .eq("table_number", tableNumber)
          .in("status", ["open", "ready"])
          .order("created_at", { ascending: true });
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "pos_orders.by_table_ids": {
        const tableNumber = Number(body.tableNumber);
        if (!tableNumber) return json({ error: "tableNumber i pavlefshëm" }, 400);
        const { data, error } = await supabase
          .from("pos_orders")
          .select("id")
          .eq("table_number", tableNumber)
          .in("status", ["open", "ready"]);
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "pos_orders.cashier": {
        const { data, error } = await supabase
          .from("pos_orders")
          .select("*")
          .in("status", ["ready", "open"])
          .order("created_at", { ascending: true });
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "order_items_split.pending": {
        const kind = String(body.kind || "");
        if (!["bar", "kitchen"].includes(kind)) return json({ error: "kind i pavlefshëm" }, 400);
        const { data, error } = await supabase
          .from("order_items_split")
          .select("*, pos_orders(table_number, mode)")
          .eq("type", kind)
          .eq("status", "pending")
          .order("created_at", { ascending: true });
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "raw_materials.list": {
        const { data, error } = await supabase
          .from("raw_materials")
          .select("id, name, quantity, unit, min_threshold, location_id, is_critical")
          .order("name");
        if (error) return json({ error: error.message }, 500);
        const enriched = (data ?? []).map((m: any) => ({
          ...m,
          quantity: Number(m.quantity),
          min_threshold: Number(m.min_threshold),
          is_low: Number(m.quantity) <= Number(m.min_threshold),
        }));
        return json({ data: enriched });
      }
      case "inv_products.list": {
        const { data, error } = await supabase
          .from("inv_products")
          .select("id, name, sort_order, menu_item_ids, units_per_sale, track_daily")
          .order("sort_order")
          .order("name");
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "shift_turns.by_date": {
        const entryDate = String(body.entryDate || "");
        if (!entryDate) return json({ error: "entryDate i mungon" }, 400);
        const { data, error } = await supabase
          .from("shift_turns")
          .select("*")
          .eq("entry_date", entryDate)
          .order("sequence_number");
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "shift_turns.range": {
        const from = String(body.from || "");
        const to = String(body.to || "");
        if (!from || !to) return json({ error: "from/to i mungon" }, 400);
        const { data, error } = await supabase
          .from("shift_turns")
          .select("entry_date, turn_data")
          .gte("entry_date", from)
          .lte("entry_date", to)
          .order("entry_date");
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "inv_next_day_stock.by_date": {
        const stockDate = String(body.stockDate || "");
        if (!stockDate) return json({ error: "stockDate i mungon" }, 400);
        const { data, error } = await supabase
          .from("inv_next_day_stock")
          .select("stock_data, mulliri_fillim")
          .eq("stock_date", stockDate)
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "transactions.range": {
        const fromISO = String(body.fromISO || "");
        const toISO = String(body.toISO || "");
        const type = body.type ? String(body.type) : null;
        const operator = body.operator ? String(body.operator) : null;
        if (!fromISO || !toISO) return json({ error: "fromISO/toISO i mungon" }, 400);
        let q = supabase
          .from("transactions")
          .select("id, items, created_at, type, amount, operator_name, table_number")
          .gte("created_at", fromISO)
          .lt("created_at", toISO)
          .order("created_at", { ascending: false });
        if (type) q = q.eq("type", type);
        if (operator) q = q.ilike("operator_name", `%${operator}%`);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "print_jobs.count_pending": {
        const createdBy = String(body.createdBy || "");
        if (!createdBy) return json({ data: { count: 0 } });
        const { count, error } = await supabase
          .from("print_jobs")
          .select("id", { count: "exact", head: true })
          .eq("created_by", createdBy)
          .eq("status", "pending");
        if (error) return json({ error: error.message }, 500);
        return json({ data: { count: count || 0 } });
      }
      case "recipes.by_material_pattern": {
        const pattern = String(body.pattern || "");
        if (!pattern) return json({ error: "pattern i mungon" }, 400);
        const { data: mats } = await supabase
          .from("raw_materials")
          .select("id, name")
          .ilike("name", pattern);
        const matIds = (mats ?? []).map((m: any) => m.id);
        if (matIds.length === 0) return json({ data: { materials: [], recipes: [] } });
        const { data: recs } = await supabase
          .from("recipes")
          .select("menu_item_id, quantity_needed, material_id")
          .in("material_id", matIds);
        return json({ data: { materials: mats, recipes: recs ?? [] } });
      }
      case "print_jobs.enqueue": {
        const row = {
          station: String(body.station || "arka"),
          kind: String(body.kind || "manual"),
          title: String(body.title || "Bileta"),
          receipt_text: String(body.receiptText || ""),
          created_by: String(body.createdBy || "Kamarier"),
          table_code: body.tableCode == null ? null : String(body.tableCode),
          amount: body.amount == null ? null : Number(body.amount),
          status: "pending",
        };
        const { data, error } = await supabase
          .from("print_jobs").insert(row).select("id").single();
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "raw_materials.ensure": {
        const names = Array.isArray(body.names) ? body.names.map((s: unknown) => String(s)) : [];
        if (names.length === 0) return json({ data: [] });
        const { data: existing } = await supabase
          .from("raw_materials")
          .select("id, name, quantity, unit, min_threshold, location_id")
          .in("name", names);
        const norm = (s: string) => s.trim().toLowerCase();
        const have = new Set((existing ?? []).map((r: any) => norm(r.name)));
        const missing = names.filter((n) => !have.has(norm(n)));
        let inserted: any[] = [];
        if (missing.length > 0) {
          const rows = missing.map((name) => ({ name, quantity: 0, unit: "cope", min_threshold: 0 }));
          const { data: ins, error } = await supabase
            .from("raw_materials")
            .insert(rows)
            .select("id, name, quantity, unit, min_threshold, location_id");
          if (error) return json({ error: error.message }, 500);
          inserted = ins ?? [];
        }
        return json({ data: [...(existing ?? []), ...inserted] });
      }
      case "app_settings.inventory_blur": {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "inventory_blur_enabled")
          .maybeSingle();
        if (error) return json({ error: error.message }, 500);
        const enabled = data?.value == null ? true : String(data.value) !== "false";
        return json({ data: { enabled } });
      }
      default:
        return json({ error: `Veprim i panjohur: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});