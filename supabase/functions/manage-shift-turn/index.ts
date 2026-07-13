import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const action = String(body.action || "");

    switch (action) {
      case "insert": {
        const { entry_date, staff_name, sequence_number, turn_data } = body;
        if (!entry_date || !staff_name || typeof sequence_number !== "number") {
          return json({ error: "Fusha të domosdoshme mungojnë" }, 400);
        }
        const { data, error } = await sb.from("shift_turns").insert({
          entry_date, staff_name, sequence_number, turn_data: turn_data ?? {},
        }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ turn: data });
      }
      case "update_turn_data": {
        const { id, turn_data } = body;
        if (!id || !UUID_RE.test(id)) return json({ error: "id i pavlefshëm" }, 400);
        const { error } = await sb.from("shift_turns").update({ turn_data }).eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      case "update_staff_name": {
        const { id, staff_name } = body;
        if (!id || !UUID_RE.test(id) || !staff_name) return json({ error: "Të dhëna të pavlefshme" }, 400);
        const { error } = await sb.from("shift_turns").update({ staff_name }).eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      case "lock": {
        const { id, turn_data, locked_at } = body;
        if (!id || !UUID_RE.test(id)) return json({ error: "id i pavlefshëm" }, 400);
        const { error } = await sb.from("shift_turns").update({
          turn_data, is_locked: true, locked_at: locked_at ?? new Date().toISOString(),
        }).eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      case "backup_daily": {
        const { entry_date, turn1_data, turn2_data, turn1_closed_at } = body;
        if (!entry_date) return json({ error: "entry_date mungon" }, 400);
        const { error } = await sb.from("inv_daily_entries").upsert({
          entry_date, turn1_data, turn2_data, turn1_closed_at,
          updated_at: new Date().toISOString(),
        }, { onConflict: "entry_date" });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      case "persist_next_day_stock": {
        const { stock_date, stock_data, mulliri_fillim } = body;
        if (!stock_date) return json({ error: "stock_date mungon" }, 400);
        const { error } = await sb.from("inv_next_day_stock").upsert({
          stock_date, stock_data: stock_data ?? {}, mulliri_fillim: Number(mulliri_fillim) || 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stock_date" });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      default:
        return json({ error: "Veprim i panjohur" }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});