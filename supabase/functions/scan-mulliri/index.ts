// Reads the "Totale:" number from a Fiorenzato grinder display photo.
// Uses Lovable AI Gateway (Gemini 2.5 Flash) vision.
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({
    key: clientKey(req, "scan-mulliri"),
    max: 10,
    windowMs: 5 * 60_000,
    blockMs: 10 * 60_000,
  });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);
  try {
    const { imageBase64, mimeType } = await req.json().catch(() => ({}));
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json({ error: "imageBase64 mungon" }, 400);
    }
    // Cap payload at ~8 MB base64 (~6 MB binary) to prevent abuse.
    if (imageBase64.length > 8 * 1024 * 1024) {
      return json({ error: "Imazhi është shumë i madh" }, 413);
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY mungon" }, 500);

    const mime = mimeType || "image/jpeg";
    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mime};base64,${imageBase64}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Ti je OCR i specializuar për ekranin e mullirit të kafesë Fiorenzato. Kthe VETËM numrin që shfaqet pas fjalës 'Totale:' në ekran. Vetëm shifra, pa presje/pika/tekst. Nëse nuk gjendet, kthe 'NONE'.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Lexo numrin pas 'Totale:' dhe ktheje si numër i pastër (vetëm shifra)." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: `AI gateway: ${resp.status} ${t}` }, 502);
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = String(raw).replace(/[^0-9]/g, "");
    if (!cleaned) return json({ error: "Nuk u lexua numri nga fotoja", raw }, 422);
    return json({ total: Number(cleaned), raw });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});