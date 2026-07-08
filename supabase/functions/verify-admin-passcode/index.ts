import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { passcode } = await req.json().catch(() => ({}));
    if (!passcode) return json({ valid: false, error: "Mungon fjalëkalimi" }, 400);
    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
    const expectedHash = setting?.value ?? (await sha256("2025"));
    const providedHash = await sha256(String(passcode));
    if (providedHash !== expectedHash) return json({ valid: false, error: "Fjalëkalim i pasaktë" }, 403);
    return json({ valid: true });
  } catch (e) {
    return json({ valid: false, error: (e as Error).message }, 500);
  }
});