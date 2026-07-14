import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";
import { adminCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = adminCorsHeaders(req);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Manager auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user } } = await supabaseAnon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "manager").maybeSingle();
    if (!roleData) return json({ error: "Manager access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action, newPasscode } = body;

    if (action === "status") {
      const { data } = await supabase
        .from("app_settings").select("key").eq("key", "admin_passcode").maybeSingle();
      return json({ isSet: !!data });
    }

    if (action === "set") {
      if (!newPasscode || String(newPasscode).length < 4) {
        return json({ error: "Fjalëkalimi duhet të ketë të paktën 4 karaktere" }, 400);
      }
      const hash = await sha256(String(newPasscode));
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "admin_passcode", value: hash, updated_at: new Date().toISOString() });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Veprim i panjohur" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});