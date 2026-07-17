import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shift-token",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f-]{36}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST" }, 405);
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const body = await req.json().catch(() => ({}));
    const auth = await requireShiftToken(req, body);
    if (!auth.ok) return auth.response;
    const action = String(body.action || "");

    if (action === "insert") {
      const { name, sort_order, menu_item_ids, units_per_sale, track_daily } = body;
      if (!name || typeof name !== "string" || name.trim().length === 0) return json({ error: "Emri mungon" }, 400);
      const { data, error } = await sb.from("inv_products").insert({
        name: name.trim(),
        sort_order: Number(sort_order) || 0,
        menu_item_ids: Array.isArray(menu_item_ids) ? menu_item_ids : [],
        units_per_sale: Number(units_per_sale) || 1,
        track_daily: track_daily === undefined ? true : !!track_daily,
      }).select("id, name, sort_order, menu_item_ids, units_per_sale, track_daily").single();
      if (error) {
        if ((error as any).code === "23505") return json({ error: "Ekziston një produkt me këtë emër" }, 409);
        return json({ error: error.message }, 500);
      }
      return json({ product: data });
    }
    if (action === "update") {
      const { id, name, menu_item_ids, units_per_sale, sort_order, track_daily } = body;
      if (!id || !UUID_RE.test(id)) return json({ error: "id i pavlefshëm" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof name === "string" && name.trim()) patch.name = name.trim();
      if (Array.isArray(menu_item_ids)) patch.menu_item_ids = menu_item_ids;
      if (units_per_sale !== undefined) patch.units_per_sale = Number(units_per_sale) || 0;
      if (sort_order !== undefined) patch.sort_order = Number(sort_order) || 0;
      if (track_daily !== undefined) patch.track_daily = !!track_daily;
      const { error } = await sb.from("inv_products").update(patch).eq("id", id);
      if (error) {
        if ((error as any).code === "23505") return json({ error: "Ekziston një produkt me këtë emër" }, 409);
        return json({ error: error.message }, 500);
      }
      return json({ ok: true });
    }
    if (action === "swap_order") {
      const { id_a, id_b } = body;
      if (!id_a || !UUID_RE.test(id_a) || !id_b || !UUID_RE.test(id_b)) return json({ error: "id i pavlefshëm" }, 400);
      const { data: rows, error: e1 } = await sb.from("inv_products")
        .select("id, sort_order").in("id", [id_a, id_b]);
      if (e1) return json({ error: e1.message }, 500);
      const a = rows?.find((r: any) => r.id === id_a);
      const b = rows?.find((r: any) => r.id === id_b);
      if (!a || !b) return json({ error: "Produkti nuk u gjet" }, 404);
      // Two-step swap to avoid unique conflicts if any
      const { error: e2 } = await sb.from("inv_products").update({ sort_order: -1 }).eq("id", a.id);
      if (e2) return json({ error: e2.message }, 500);
      const { error: e3 } = await sb.from("inv_products").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (e3) return json({ error: e3.message }, 500);
      const { error: e4 } = await sb.from("inv_products").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (e4) return json({ error: e4.message }, 500);
      return json({ ok: true });
    }
    if (action === "delete") {
      const { id } = body;
      if (!id || !UUID_RE.test(id)) return json({ error: "id i pavlefshëm" }, 400);
      const { error } = await sb.from("inv_products").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    return json({ error: "Veprim i panjohur" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});