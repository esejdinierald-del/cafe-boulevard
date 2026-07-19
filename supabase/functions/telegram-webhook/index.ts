import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public webhook — Telegram calls this. No CORS needed (server-to-server).
function normalizePhone(raw: string): string {
  if (!raw) return "";
  let p = String(raw).replace(/[\s\-()]/g, "").trim();
  if (!p) return "";
  // Telegram may send with or without leading +
  if (!p.startsWith("+")) {
    if (p.startsWith("00")) p = "+" + p.slice(2);
    else if (p.startsWith("355")) p = "+" + p;
    else if (p.startsWith("0")) p = "+355" + p.slice(1);
    else p = "+" + p;
  }
  return p;
}

async function tg(method: string, body: unknown) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN mungon");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const update = await req.json().catch(() => ({}));

    // Handle inline button clicks (callback_query)
    if (update?.callback_query) {
      const cq = update.callback_query;
      const data: string = cq.data || "";
      const cqId: string = cq.id;
      const fromName: string = cq.from?.first_name || "staf";
      const cqChatId = cq.message?.chat?.id;
      const cqMsgId = cq.message?.message_id;
      const origText: string = cq.message?.text || "";

      if (data.startsWith("accept_order:")) {
        const orderId = data.slice("accept_order:".length).trim();
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const internalSecret = Deno.env.get("INTERNAL_WEBHOOK_SECRET") || "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

        let ok = false;
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/update-order-status`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": internalSecret,
              "apikey": anonKey,
              "Authorization": `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ id: orderId, status: "accepted" }),
          });
          ok = res.ok;
        } catch (_) {
          ok = false;
        }

        if (ok) {
          await tg("answerCallbackQuery", { callback_query_id: cqId, text: "✅ U pranua!" });
          if (cqChatId && cqMsgId) {
            await tg("editMessageText", {
              chat_id: cqChatId,
              message_id: cqMsgId,
              text: origText + "\n\n✅ Pranuar nga " + fromName,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            });
          }
        } else {
          await tg("answerCallbackQuery", {
            callback_query_id: cqId,
            text: "⚠️ Kjo porosi është trajtuar tashmë",
            show_alert: true,
          });
          if (cqChatId && cqMsgId) {
            await tg("editMessageReplyMarkup", {
              chat_id: cqChatId,
              message_id: cqMsgId,
              reply_markup: { inline_keyboard: [] },
            });
          }
        }
        return new Response(JSON.stringify({ ok: true }));
      }

      if (data.startsWith("review_order:")) {
        await tg("answerCallbackQuery", {
          callback_query_id: cqId,
          text: "🔍 Kontrollo me klientin nëse artikujt janë të saktë.",
          show_alert: true,
        });
        if (cqChatId && cqMsgId) {
          await tg("editMessageText", {
            chat_id: cqChatId,
            message_id: cqMsgId,
            text: origText + "\n\n🔍 Në rishikim nga " + fromName,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          });
        }
        return new Response(JSON.stringify({ ok: true }));
      }

      if (data.startsWith("accept_request:")) {
        const reqId = data.slice("accept_request:".length).trim();
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const internalSecret = Deno.env.get("INTERNAL_WEBHOOK_SECRET") || "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

        let ok = false;
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/complete-request`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": internalSecret,
              "apikey": anonKey,
              "Authorization": `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ id: reqId, type: "service_request" }),
          });
          ok = res.ok;
        } catch (_) {
          ok = false;
        }

        if (ok) {
          await tg("answerCallbackQuery", { callback_query_id: cqId, text: "✅ U pranua!" });
          if (cqChatId && cqMsgId) {
            await tg("editMessageText", {
              chat_id: cqChatId,
              message_id: cqMsgId,
              text: origText + "\n\n✅ Pranuar nga " + fromName,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            });
          }
        } else {
          await tg("answerCallbackQuery", {
            callback_query_id: cqId,
            text: "⚠️ Kjo thirrje është trajtuar tashmë",
            show_alert: true,
          });
          if (cqChatId && cqMsgId) {
            await tg("editMessageReplyMarkup", {
              chat_id: cqChatId,
              message_id: cqMsgId,
              reply_markup: { inline_keyboard: [] },
            });
          }
        }
        return new Response(JSON.stringify({ ok: true }));
      }

      await tg("answerCallbackQuery", { callback_query_id: cqId });
      return new Response(JSON.stringify({ ok: true }));
    }

    const msg = update?.message ?? update?.edited_message;
    if (!msg?.chat?.id) return new Response(JSON.stringify({ ok: true }));

    const chatId = msg.chat.id;
    const text: string = msg.text || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // /start → ask for contact
    if (text.startsWith("/start")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "👋 Mirësevini! Për t'u lidhur me sistemin, ju lutem ndani numrin tuaj të telefonit.",
        reply_markup: {
          keyboard: [[{ text: "📱 Ndaj numrin tim", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    // Contact shared
    if (msg.contact?.phone_number) {
      // Only accept contact of the sender themselves
      if (msg.contact.user_id && msg.from?.id && msg.contact.user_id !== msg.from.id) {
        await tg("sendMessage", { chat_id: chatId, text: "⚠️ Ju lutem ndani numrin tuaj personal, jo të një kontakti tjetër." });
        return new Response(JSON.stringify({ ok: true }));
      }
      const normalized = normalizePhone(msg.contact.phone_number);

      // Load candidates and match by normalized phone
      const { data: staffList, error } = await supabase
        .from("staff_members")
        .select("id, name, phone, is_active");
      if (error) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Gabim serveri: " + error.message });
        return new Response(JSON.stringify({ ok: true }));
      }
      const match = (staffList ?? []).find(
        (s: any) => s.is_active && s.phone && normalizePhone(s.phone) === normalized,
      );

      if (!match) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "❌ Numri s'u gjet në sistem — kontakto menaxherin që ta shtojë saktë.",
          reply_markup: { remove_keyboard: true },
        });
        return new Response(JSON.stringify({ ok: true }));
      }

      const { error: upErr } = await supabase
        .from("staff_members")
        .update({ telegram_chat_id: String(chatId) })
        .eq("id", match.id);
      if (upErr) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Gabim gjatë ruajtjes: " + upErr.message });
        return new Response(JSON.stringify({ ok: true }));
      }

      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ U lidh! Tani do të marrësh njoftime si <b>${match.name}</b>.`,
        parse_mode: "HTML",
        reply_markup: { remove_keyboard: true },
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    // Default help
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Shkruaj /start për t'u lidhur me sistemin.",
    });
    return new Response(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("telegram-webhook error", e);
    return new Response(JSON.stringify({ ok: true }));
  }
});