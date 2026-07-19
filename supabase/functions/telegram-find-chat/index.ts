import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256, timingSafeEqualHex } from "../_shared/hash.ts";
import { adminCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = adminCorsHeaders(req);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { passcode, action, chatId } = body || {};
    if (!passcode) return json({ error: "Mungon fjalëkalimi" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: setting } = await supabase
      .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
    const expectedHash = setting?.value;
    if (!expectedHash) return json({ error: "Admin passcode nuk është konfiguruar" }, 500);
    const providedHash = await sha256(String(passcode));
    if (!timingSafeEqualHex(providedHash, String(expectedHash))) {
      return json({ error: "Fjalëkalim i pasaktë" }, 403);
    }

    if (action === "save_chat_id") {
      const cleaned = String(chatId || "").trim();
      if (!cleaned) return json({ error: "Mungon chatId" }, 400);
      const { error: upErr } = await supabase
        .from("app_settings")
        .upsert({ key: "telegram_chat_id", value: cleaned, updated_at: new Date().toISOString() });
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true, chatId: cleaned });
    }

    if (action === "set_webhook") {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!token) return json({ error: "TELEGRAM_BOT_TOKEN mungon" }, 500);
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
      const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "edited_message"],
          drop_pending_updates: true,
        }),
      });
      const d = await r.json();
      if (!d.ok) return json({ error: "Telegram: " + (d.description || "gabim"), raw: d }, 502);
      return json({ ok: true, webhookUrl, result: d.result });
    }

    if (action === "webhook_info") {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!token) return json({ error: "TELEGRAM_BOT_TOKEN mungon" }, 500);
      const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const d = await r.json();
      return json(d);
    }

    if (action === "set_bot_profile") {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!token) return json({ error: "TELEGRAM_BOT_TOKEN mungon" }, 500);
      const description =
        "Bot i njoftimeve për stafin e Boulevard Café — thirrje shërbimi dhe porosi të reja në kohë reale.";
      const shortDescription = "Njoftime stafi Boulevard Café";
      const r1 = await fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const d1 = await r1.json();
      if (!d1.ok) return json({ error: "setMyDescription: " + (d1.description || "gabim"), raw: d1 }, 502);
      const r2 = await fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ short_description: shortDescription }),
      });
      const d2 = await r2.json();
      if (!d2.ok) return json({ error: "setMyShortDescription: " + (d2.description || "gabim"), raw: d2 }, 502);
      return json({ ok: true, description, short_description: shortDescription });
    }

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) return json({ error: "TELEGRAM_BOT_TOKEN mungon" }, 500);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const tgData = await tgRes.json();
    if (!tgData.ok) return json({ error: "Telegram: " + (tgData.description || "gabim"), raw: tgData }, 502);

    // Collect unique chats
    const chatsMap = new Map<string, { chat_id: number; title: string; type: string; last_text: string; last_date: number }>();
    for (const upd of tgData.result || []) {
      const msg = upd.message || upd.edited_message || upd.channel_post || upd.my_chat_member;
      const chat = msg?.chat;
      if (!chat) continue;
      const key = String(chat.id);
      const title = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "(pa emër)";
      const prev = chatsMap.get(key);
      const date = msg?.date || 0;
      if (!prev || date > prev.last_date) {
        chatsMap.set(key, {
          chat_id: chat.id,
          title,
          type: chat.type,
          last_text: msg?.text || msg?.caption || "",
          last_date: date,
        });
      }
    }
    const chats = Array.from(chatsMap.values()).sort((a, b) => b.last_date - a.last_date);
    return json({ chats, count: chats.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});