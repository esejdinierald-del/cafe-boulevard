// Admin-passcode-guarded print station queue. Every request re-verifies
// the admin passcode (hashed against app_settings.admin_passcode).
// This replaces direct anon reads/writes on public.print_jobs from
// PrintStation.tsx, which now has no legitimate anon SELECT policy.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-passcode",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({
    key: clientKey(req, "print-station"),
    max: 120,
    windowMs: 60_000,
    blockMs: 60_000,
  });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë." }, 429);

  try {
    const body = await req.json().catch(() => ({}));
    const passcode = req.headers.get("x-admin-passcode") || String(body.adminPassword || "");
    if (!passcode) return json({ error: "Mungon fjalëkalimi" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
    const expectedHash = setting?.value;
    if (!expectedHash) return json({ error: "Admin passcode nuk është konfiguruar" }, 500);
    if ((await sha256(passcode)) !== expectedHash) return json({ error: "Fjalëkalim i pasaktë" }, 403);

    const action = String(body.action || "");
    const station = String(body.station || "arka");

    switch (action) {
      case "list_recent": {
        const { data, error } = await supabase
          .from("print_jobs").select("*")
          .eq("station", station)
          .order("created_at", { ascending: false })
          .limit(30);
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "claim": {
        const id = String(body.id || "");
        const attempts = Number(body.attempts || 0);
        if (!id) return json({ error: "id i mungon" }, 400);
        const { data, error } = await supabase.from("print_jobs")
          .update({ status: "printing", attempts: attempts + 1 })
          .eq("id", id).eq("status", "pending").select("id").maybeSingle();
        if (error) return json({ error: error.message }, 500);
        return json({ claimed: !!data });
      }
      case "mark_printed": {
        const id = String(body.id || "");
        if (!id) return json({ error: "id i mungon" }, 400);
        await supabase.from("print_jobs")
          .update({ status: "printed", printed_at: new Date().toISOString() })
          .eq("id", id);
        return json({ ok: true });
      }
      case "requeue": {
        const id = String(body.id || "");
        if (!id) return json({ error: "id i mungon" }, 400);
        await supabase.from("print_jobs")
          .update({ status: "pending", attempts: 0 })
          .eq("id", id);
        return json({ ok: true });
      }
      case "set_status": {
        const id = String(body.id || "");
        const status = String(body.status || "");
        if (!id || !status) return json({ error: "id/status i mungon" }, 400);
        await supabase.from("print_jobs").update({ status }).eq("id", id);
        return json({ ok: true });
      }
      default:
        return json({ error: `Veprim i panjohur: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});