import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shift-token",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({ key: clientKey(req, "pos-confirm-order"), max: 180, windowMs: 60_000, blockMs: 60_000 });
  if (!rl.ok) return jsonResponse({ error: "Shumë kërkesa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const body = await req.json().catch(() => ({}));
    const auth = await requireShiftToken(req, body);
    if (!auth.ok) return auth.response;
    const { splitId, confirmedBy } = body;
    if (!splitId) return jsonResponse({ error: "Mungon splitId" }, 400);

    // Atomic: confirm split, mark order ready, record sale, decrement inventory — all in one DB transaction.
    const { data, error } = await supabase.rpc("confirm_pos_split", {
      p_split_id: splitId,
      p_confirmed_by: confirmedBy ?? null,
    });
    if (error) {
      const msg = error.message || "Gabim gjatë konfirmimit";
      if (msg.includes("konfirmuar tashmë")) {
        // Idempotent: treat duplicate confirmation as success
        const { data: split } = await supabase
          .from("order_items_split")
          .select("order_id")
          .eq("id", splitId)
          .maybeSingle();
        return jsonResponse({ success: true, alreadyConfirmed: true, orderId: split?.order_id ?? null });
      }
      const status = msg.includes("nuk u gjet") ? 404 : 500;
      return jsonResponse({ error: msg }, status);
    }
    return jsonResponse(data ?? { success: true });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});