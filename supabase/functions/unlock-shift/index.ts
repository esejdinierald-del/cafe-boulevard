import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  maybeCleanup();
  const rl = checkRateLimit({
    key: clientKey(req, "unlock-shift"),
    max: 5,
    windowMs: 5 * 60_000,
    blockMs: 15 * 60_000,
  });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const { token, adminPassword } = await req.json();

    if (!token || typeof token !== "string" || token.length < 6 || token.length > 50) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminPassword || typeof adminPassword !== "string") {
      return new Response(
        JSON.stringify({ error: "Fjalëkalimi i adminit është i detyrueshëm" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Mandatory admin PIN — validated server-side against app_settings.
    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
    const expectedHash = setting?.value;
    if (!expectedHash) {
      return new Response(
        JSON.stringify({ error: "Admin passcode nuk është konfiguruar" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const providedHash = await sha256(String(adminPassword));
    if (providedHash !== expectedHash) {
      return new Response(
        JSON.stringify({ error: "Fjalëkalim i pasaktë" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the token exists and is within shift range
    const { data: shift, error: fetchError } = await supabase
      .from("shift_tokens")
      .select("id, token, unlocked")
      .eq("token", token)
      .gte("shift_end", now)
      .lte("shift_start", now)
      .maybeSingle();

    if (fetchError || !shift) {
      return new Response(
        JSON.stringify({ error: "Token not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (shift.unlocked) {
      return new Response(
        JSON.stringify({ success: true, already_unlocked: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unlock the shift
    const { error: updateError } = await supabase
      .from("shift_tokens")
      .update({ unlocked: true })
      .eq("id", shift.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to unlock shift" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
