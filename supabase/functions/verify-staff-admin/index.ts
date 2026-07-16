import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";
import { verifyStaffAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({
    key: clientKey(req, "verify-staff-admin"),
    max: 8,
    windowMs: 5 * 60_000,
    blockMs: 15 * 60_000,
  });
  if (!rl.ok) return json({ valid: false, error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { staffId, staffName, password } = await req.json().catch(() => ({}));
    const r = await verifyStaffAdmin(supabase, { staffId, staffName, password });
    if (!r.ok) return json({ valid: false, error: r.error }, r.status);
    return json({ valid: true, admin: r.admin });
  } catch (e) {
    return json({ valid: false, error: (e as Error).message }, 500);
  }
});