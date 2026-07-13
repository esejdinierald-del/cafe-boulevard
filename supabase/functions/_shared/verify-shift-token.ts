// Shared helper: verify a shift token is currently valid.
// Accepts token from `x-shift-token` header or a `shiftToken` field in the JSON body.
// Returns { ok: true, shiftId } on success, or a Response to return on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shift-token",
};

export function shiftAuthCorsHeaders() {
  return corsHeaders;
}

export async function requireShiftToken(
  req: Request,
  body: Record<string, unknown> | null,
): Promise<{ ok: true; shiftId: string; token: string } | { ok: false; response: Response }> {
  const headerToken = req.headers.get("x-shift-token");
  const bodyToken =
    body && typeof (body as any).shiftToken === "string" ? ((body as any).shiftToken as string) : null;
  const token = (headerToken || bodyToken || "").trim();

  if (!token || token.length < 6 || token.length > 50) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Turn i pavlefshëm — mungon shift token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("shift_tokens")
    .select("id, unlocked")
    .eq("token", token)
    .gte("shift_end", now)
    .lte("shift_start", now)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Turn i skaduar ose i pavlefshëm" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      ),
    };
  }

  return { ok: true, shiftId: data.id, token };
}