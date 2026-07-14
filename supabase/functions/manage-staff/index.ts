import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Require manager auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user } } = await supabaseAnon.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "manager").maybeSingle();
    if (!roleData) return json({ error: "Manager access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "list") {
      const { data, error } = await supabase
        .from("staff_members")
        .select("id, name, role, is_active, created_at")
        .order("name");
      if (error) return json({ error: error.message }, 500);
      const staff = (data ?? []).map((s: any) => ({
        id: s.id, name: s.name, role: s.role, active: s.is_active, created_at: s.created_at,
      }));
      return json({ staff });
    }

    if (action === "create") {
      const { name, pin, role } = body;
      if (!name || !pin || !role) return json({ error: "Mungon emri, PIN-i ose roli" }, 400);
      if (!/^\d{4}$/.test(String(pin))) return json({ error: "PIN duhet të jetë 4 shifra" }, 400);
      if (!["waiter", "kitchen", "manager", "admin"].includes(role)) return json({ error: "Rol i pavlefshëm" }, 400);
      const { data, error } = await supabase
        .from("staff_members")
        .insert({ name: String(name).trim(), role, is_active: true })
        .select("id, name, role, is_active")
        .single();
      if (error) {
        if (error.code === "23505") return json({ error: "Ky emër ekziston tashmë" }, 409);
        return json({ error: error.message }, 500);
      }
      // Hash PIN via server-side RPC (bcrypt).
      const { error: pinErr } = await supabase.rpc("set_staff_pin", { p_id: (data as any).id, p_pin: String(pin) });
      if (pinErr) {
        await supabase.from("staff_members").delete().eq("id", (data as any).id);
        return json({ error: pinErr.message }, 500);
      }
      return json({ staff: { ...data, active: (data as any).is_active } });
    }

    if (action === "update") {
      const { id, name, role, active, pin } = body;
      if (!id) return json({ error: "Mungon id" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof name === "string") patch.name = name.trim();
      if (typeof role === "string") {
        if (!["waiter", "kitchen", "manager", "admin"].includes(role)) return json({ error: "Rol i pavlefshëm" }, 400);
        patch.role = role;
      }
      if (typeof active === "boolean") patch.is_active = active;
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("staff_members").update(patch).eq("id", id);
        if (error) return json({ error: error.message }, 500);
      }
      if (pin != null) {
        if (!/^\d{4}$/.test(String(pin))) return json({ error: "PIN duhet të jetë 4 shifra" }, 400);
        const { error: pinErr } = await supabase.rpc("set_staff_pin", { p_id: id, p_pin: String(pin) });
        if (pinErr) return json({ error: pinErr.message }, 500);
      }
      return json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "Mungon id" }, 400);
      const { error } = await supabase.from("staff_members").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Veprim i panjohur" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});