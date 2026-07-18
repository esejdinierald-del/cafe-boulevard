import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256, timingSafeEqualHex } from "../_shared/hash.ts";
import { adminCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = adminCorsHeaders(req, "x-internal-secret");
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    if (!text) return json({ error: "Mungon 'text'" }, 400);

    // Auth: internal shared secret OR admin passcode
    const internal = req.headers.get("x-internal-secret");
    const expectedInternal = Deno.env.get("INTERNAL_WEBHOOK_SECRET") || "";
    let authorized = !!internal && !!expectedInternal && internal === expectedInternal;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (!authorized && body?.passcode) {
      const { data: setting } = await supabase
        .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
      const expectedHash = setting?.value;
      if (expectedHash) {
        const providedHash = await sha256(String(body.passcode));
        if (timingSafeEqualHex(providedHash, String(expectedHash))) authorized = true;
      }
    }
    if (!authorized) return json({ error: "I paautorizuar" }, 403);

    const { data: chatSetting } = await supabase
      .from("app_settings").select("value").eq("key", "telegram_chat_id").maybeSingle();
    const chatId = chatSetting?.value;
    if (!chatId) return json({ error: "telegram_chat_id nuk është konfiguruar" }, 400);

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) return json({ error: "TELEGRAM_BOT_TOKEN mungon" }, 500);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) return json({ error: "Telegram: " + (tgData.description || "gabim"), raw: tgData }, 502);
    return json({ ok: true, message_id: tgData.result?.message_id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});