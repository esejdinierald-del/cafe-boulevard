import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { id, type, shift_token } = await req.json();

    // Validate inputs
    if (!id || typeof id !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!type || !["service_request", "order"].includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth: shift token OR internal shared secret (Telegram callback)
    const internal = req.headers.get("x-internal-secret");
    const expectedInternal = Deno.env.get("INTERNAL_WEBHOOK_SECRET") || "";
    const internalAuthorized = !!internal && !!expectedInternal && internal === expectedInternal;

    if (!internalAuthorized) {
      if (!shift_token || typeof shift_token !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing shift_token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const now = new Date().toISOString();
      const { data: shift } = await supabase
        .from("shift_tokens")
        .select("id")
        .eq("token", shift_token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (!shift) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired shift token" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Complete the request/order
    const table = type === "service_request" ? "service_requests" : "orders";
    const { data, error } = await supabase
      .from(table)
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ error: "Failed to complete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!data) {
      return new Response(
        JSON.stringify({ error: "Not found or already handled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
