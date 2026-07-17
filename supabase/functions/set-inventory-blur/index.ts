// Admin-guarded toggle for the global "inventory_blur_enabled" flag in app_settings.
// Only a logged-in admin (per-staff bcrypt password) can flip it.
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
    key: clientKey(req, "set-inventory-blur"),
    max: 20,
    windowMs: 5 * 60_000,
    blockMs: 10 * 60_000,
  });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const body = await req.json().catch(() => ({}));
    const { adminStaffId, adminName, adminPassword, enabled } = body ?? {};
    if (typeof enabled !== "boolean") return json({ error: "Vlera 'enabled' i pavlefshme" }, 400);
    const v = await verifyStaffAdmin(supabase, {
      staffId: adminStaffId,
      staffName: adminName,
      password: adminPassword,
    });
    if (!v.ok) return json({ error: v.error }, v.status);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "inventory_blur_enabled", value: enabled ? "true" : "false", updated_at: new Date().toISOString() });
    if (error) return json({ error: error.message }, 500);
    return json({ data: { enabled } });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});