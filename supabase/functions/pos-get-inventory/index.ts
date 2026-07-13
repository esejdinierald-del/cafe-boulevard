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

    if (req.method === "POST") {
      const body = await req.json();
      if (body.action === "addSupply") {
        const { materialId, quantity, note = null, operatorName, locationId = null } = body;
        if (!materialId || !operatorName || typeof quantity !== "number" || quantity <= 0) {
          return jsonResponse({ error: "Të dhëna të pavlefshme për furnizim" }, 400);
        }
        const locId = locationId && /^[0-9a-f-]{36}$/i.test(String(locationId)) ? locationId : null;
        const { data, error } = await supabase.rpc("add_supply", {
          p_material_id: materialId, p_quantity: quantity, p_note: note,
          p_operator_name: operatorName, p_location_id: locId,
        });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ material: data });
      }
      return jsonResponse({ error: "Veprim i panjohur" }, 400);
    }

    const url = new URL(req.url);
    const lowStockOnly = url.searchParams.get("lowStockOnly") === "true";

    const { data: materials, error } = await supabase.from("raw_materials").select("*").order("name");
    if (error) return jsonResponse({ error: error.message }, 500);

    const normalized = (materials ?? []).map((m: any) => {
      const quantity = Number(m.quantity);
      const minThreshold = Number(m.min_threshold);
      return { ...m, quantity, min_threshold: minThreshold, is_low: quantity <= minThreshold };
    });
    const result = lowStockOnly ? normalized.filter((m) => m.is_low) : normalized;
    return jsonResponse({ materials: result, lowStockCount: normalized.filter((m) => m.is_low).length });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});