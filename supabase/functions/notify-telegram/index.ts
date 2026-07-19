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
    const reply_markup = body?.reply_markup;

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

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) return json({ error: "TELEGRAM_BOT_TOKEN mungon" }, 500);

    // Recipients = staff on active shift with linked telegram_chat_id.
    // Legacy/already-open staff sessions may not have active_shift_token backfilled yet,
    // so if an active shift exists but no exact staff-token match is found, send to
    // all linked active staff instead of silently falling back only to the admin group.
    const nowIso = new Date().toISOString();
    const { data: activeTokens } = await supabase
      .from("shift_tokens").select("token")
      .not("unlocked", "is", false).lte("shift_start", nowIso).gte("shift_end", nowIso);
    const activeTokenSet = new Set((activeTokens ?? []).map(t => t.token).filter(Boolean));

    const recipients = new Set<string>();
    let linkedStaffChats: string[] = [];
    if (activeTokenSet.size > 0) {
      const { data: staffList } = await supabase
        .from("staff_members")
        .select("telegram_chat_id, active_shift_token")
        .eq("is_active", true)
        .not("telegram_chat_id", "is", null);
      linkedStaffChats = (staffList ?? []).map(s => String(s.telegram_chat_id)).filter(Boolean);
      for (const s of staffList ?? []) {
        if (s.active_shift_token && activeTokenSet.has(s.active_shift_token) && s.telegram_chat_id) {
          recipients.add(String(s.telegram_chat_id));
        }
      }
      if (recipients.size === 0) {
        for (const chatId of linkedStaffChats) recipients.add(chatId);
      }
    }

    // Fallback: admin chat if configured and no active-shift recipients
    if (recipients.size === 0) {
      const { data: chatSetting } = await supabase
        .from("app_settings").select("value").eq("key", "telegram_chat_id").maybeSingle();
      if (chatSetting?.value) recipients.add(String(chatSetting.value));
    }

    if (recipients.size === 0) return json({ error: "Asnjë marrës Telegram" }, 400);

    const results: Array<{ chat_id: string; ok: boolean; message_id?: number; error?: string }> = [];
    for (const chatId of recipients) {
      const tgPayload: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
      if (reply_markup && typeof reply_markup === "object") tgPayload.reply_markup = reply_markup;
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tgPayload),
        });
        const tgData = await tgRes.json();
        if (tgData.ok) results.push({ chat_id: chatId, ok: true, message_id: tgData.result?.message_id });
        else results.push({ chat_id: chatId, ok: false, error: tgData.description || "gabim" });
      } catch (e) {
        results.push({ chat_id: chatId, ok: false, error: (e as Error).message });
      }
    }
    const sent = results.filter(r => r.ok).length;
    return json({ ok: sent > 0, sent, total: recipients.size, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});