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

const UUID_RE = /^[0-9a-f-]{36}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST" }, 405);

  maybeCleanup();
  const rl = checkRateLimit({
    key: clientKey(req, "admin-reopen-turn"),
    max: 10,
    windowMs: 5 * 60_000,
    blockMs: 15 * 60_000,
  });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "reopen");

    const va = await verifyStaffAdmin(sb, {
      staffId: body.adminStaffId,
      staffName: body.adminName,
      password: body.adminPassword,
    });
    if (!va.ok) return json({ error: va.error }, va.status);

    if (action === "list_locked") {
      const { data, error } = await sb
        .from("shift_turns")
        .select("id, entry_date, staff_name, sequence_number, is_locked, locked_at, created_at")
        .eq("is_locked", true)
        .order("locked_at", { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 500);
      return json({ turns: data ?? [] });
    }

    // Default: reopen a specific turn
    const turnId = String(body.turnId || "");
    if (!turnId || !UUID_RE.test(turnId)) return json({ error: "turnId i pavlefshëm" }, 400);

    const { data, error } = await sb.rpc("admin_reopen_shift_turn", { p_turn_id: turnId });
    if (error) return json({ error: error.message }, 500);

    // Audit
    try {
      await sb.from("audit_log").insert({
        action: "ADMIN_REOPEN_TURN",
        table_name: "shift_turns",
        row_id: turnId,
        new_data: { admin: va.admin, turn: data },
      });
    } catch { /* best-effort */ }

    return json({ ok: true, turn: data });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});