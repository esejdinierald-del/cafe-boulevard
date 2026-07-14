import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";

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
    const { adminPassword, startISO, endISO } = parsed;
    if (!adminPassword) return json({ error: "Mungon fjalëkalimi" }, 403);
    if (!startISO || !endISO) return json({ error: "Mungon intervali" }, 400);

    // Verify passcode (same source as pos-cancel-item / verify-admin-passcode)
    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
    const expectedHash = setting?.value;
    if (!expectedHash) return json({ error: "Admin passcode nuk është konfiguruar" }, 500);
    const providedHash = await sha256(String(adminPassword));
    if (providedHash !== expectedHash) return json({ error: "Fjalëkalim i pasaktë" }, 403);

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