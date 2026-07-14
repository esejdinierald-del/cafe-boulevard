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

  try {
    const { action, id, token, shift_start, shift_end, adminPassword } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // ACTION: admin_bypass — verify admin passcode and return an active
    // shift token (creates one covering the next 12h if none is active).
    if (action === "admin_bypass") {
      if (!adminPassword) {
        return new Response(JSON.stringify({ error: "Mungon fjalëkalimi" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      maybeCleanup();
      const rl = checkRateLimit({
        key: clientKey(req, "manage-shift:admin_bypass"),
        max: 5,
        windowMs: 5 * 60_000,
        blockMs: 15 * 60_000,
      });
      if (!rl.ok) {
        return new Response(
          JSON.stringify({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec) } }
        );
      }
      const { data: setting } = await supabase
        .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
      const expectedHash = setting?.value;
      if (!expectedHash) {
        return new Response(JSON.stringify({ error: "Admin passcode nuk është konfiguruar" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const providedHash = await sha256(String(adminPassword));
      if (providedHash !== expectedHash) {
        return new Response(JSON.stringify({ error: "Fjalëkalim i pasaktë" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Return existing active token if any
      const { data: existing } = await supabase
        .from("shift_tokens")
        .select("token, shift_end")
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();
      if (existing) {
        return new Response(
          JSON.stringify({ token: existing.token, shift_end: existing.shift_end }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create a new 12h token
      const start = new Date();
      const end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
      const newToken = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      const { error } = await supabase.from("shift_tokens").insert({
        token: newToken,
        shift_start: start.toISOString(),
        shift_end: end.toISOString(),
        unlocked: true,
      });
      if (error) {
        return new Response(JSON.stringify({ error: "Failed to create token" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      return new Response(
        JSON.stringify({ token: newToken, shift_end: end.toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actions that require manager authentication
    const MANAGER_ACTIONS = ['create', 'extend', 'close', 'get_or_create'];

    if (MANAGER_ACTIONS.includes(action)) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabaseAnon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      const { data: { user } } = await supabaseAnon.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['manager', 'admin'])
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Manager access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ACTION: get_or_create — fetch active shift token or create one
    if (action === "get_or_create") {
      if (!shift_start || !shift_end) {
        return new Response(
          JSON.stringify({ error: "Missing shift_start or shift_end" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing active token
      const { data: existing } = await supabase
        .from("shift_tokens")
        .select("token, unlocked")
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ token: existing.token, unlocked: existing.unlocked }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate new token
      const newToken = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      const { error } = await supabase.from("shift_tokens").insert({
        token: newToken,
        shift_start,
        shift_end,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to create token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ token: newToken, unlocked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: check_unlock — poll if token is unlocked
    if (action === "check_unlock") {
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Missing token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data } = await supabase
        .from("shift_tokens")
        .select("unlocked")
        .eq("token", token)
        .maybeSingle();

      return new Response(
        JSON.stringify({ unlocked: data?.unlocked ?? false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: complete — complete a service_request or order
    if (action === "complete" || action === "cancel") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token is active
      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { type } = await req.json().catch(() => ({ type: null }));
      // We already parsed the body above so use the original parsed values
    }

    // ACTION: complete_request — complete a service request
    if (action === "complete_request") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const status = action === "complete_request" ? "completed" : "cancelled";
      const { error } = await supabase
        .from("service_requests")
        .update({ status, completed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to update" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: cancel_request
    if (action === "cancel_request") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("service_requests")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to cancel" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: complete_order
    if (action === "complete_order") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to complete order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: cancel_order
    if (action === "cancel_order") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to cancel order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: delete_request
    if (action === "delete_request") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("service_requests")
        .delete()
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to delete" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: delete_order
    if (action === "delete_order") {
      if (!id || !token) {
        return new Response(
          JSON.stringify({ error: "Missing id or token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to delete order" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
