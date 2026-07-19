import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({
    key: clientKey(req, "verify-staff-pin"),
    max: 8,
    windowMs: 5 * 60_000,
    blockMs: 10 * 60_000,
  });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { name, pin, shiftToken } = await req.json();
    if (!name || !pin || !shiftToken) return json({ error: "Mungojnë të dhënat" }, 400);

    // Validate shift token active
    const now = new Date().toISOString();
    const { data: shift } = await supabase
      .from("shift_tokens").select("id, unlocked")
      .eq("token", shiftToken).gte("shift_end", now).lte("shift_start", now).maybeSingle();
    if (!shift) return json({ error: "Turn i pavlefshëm ose i skaduar" }, 403);

    const { data: staff, error: rpcErr } = await supabase.rpc("verify_staff_pin_by_name", {
      p_name: String(name).trim(),
      p_pin: String(pin),
    });
    if (rpcErr) return json({ error: rpcErr.message }, 500);
    const row = Array.isArray(staff) ? staff[0] : staff;
    if (!row) return json({ error: "PIN i pasaktë ose kamarier i pavlefshëm" }, 403);

    // Track which shift this staff member is currently on, for targeted Telegram alerts
    try {
      await supabase.from("staff_members").update({ active_shift_token: shiftToken }).eq("id", row.id);
    } catch (_) { /* non-fatal */ }

    return json({
      ok: true,
      id: row.id,
      name: row.name,
      role: row.role,
      is_admin: !!row.is_admin,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});