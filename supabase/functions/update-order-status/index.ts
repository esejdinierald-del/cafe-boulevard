import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken, shiftAuthCorsHeaders } from "../_shared/verify-shift-token.ts";

const corsHeaders = shiftAuthCorsHeaders();
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED = new Set(["accepted", "rejected"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const auth = await requireShiftToken(req, body);
    if (!auth.ok) return auth.response;

    const id = body && typeof body.id === "string" ? body.id : "";
    const status = body && typeof body.status === "string" ? body.status : "";
    if (!id) return json({ error: "Mungon id" }, 400);
    if (!ALLOWED.has(status)) return json({ error: "Status i pavlefshëm" }, 400);

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
    return json({ success: true, order: data });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});