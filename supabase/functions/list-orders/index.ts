import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken, shiftAuthCorsHeaders } from "../_shared/verify-shift-token.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = shiftAuthCorsHeaders();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({ key: clientKey(req, "list-orders"), max: 240, windowMs: 60_000, blockMs: 60_000 });
  if (!rl.ok) return json({ error: "Shumë kërkesa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    let body: Record<string, unknown> | null = null;
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = null; }
    }
    const auth = await requireShiftToken(req, body);
    if (!auth.ok) return auth.response;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const status = (body && typeof (body as any).status === "string") ? (body as any).status : "pending";

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: true });

    if (status === "all") {
      query = query.in("status", ["pending", "completed"]);
    } else {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) return json({ error: error.message }, 500);
    return json({ orders: data ?? [] });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});