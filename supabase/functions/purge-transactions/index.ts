import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";
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
  const rl = checkRateLimit({ key: clientKey(req, "purge-transactions"), max: 5, windowMs: 10 * 60_000, blockMs: 30 * 60_000 });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const parsed = await req.json().catch(() => ({}));
    const auth = await requireShiftToken(req, parsed);
    if (!auth.ok) return auth.response;
    const { adminStaffId, adminPassword, startISO, endISO } = parsed;
    if (!startISO || !endISO) return json({ error: "Mungon intervali" }, 400);
    const va = await verifyStaffAdmin(supabase, { staffId: adminStaffId, password: adminPassword });
    if (!va.ok) return json({ error: va.error }, va.status);

    // Delete transactions in range. RLS is bypassed via service role.
    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("type", "sale")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .select("id");
    if (error) return json({ error: error.message }, 500);

    return json({ success: true, deleted: (data ?? []).length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});