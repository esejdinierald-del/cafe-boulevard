import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = language === 'sq' 
      ? `Ti je asistenti virtual i Boulevard Café Elbasan. Je miqësor dhe i ndihmshëm.
      
Informacione për kafenenë:
- Emri: Boulevard Café Elbasan
- Orari: E hënë - E diel, 07:00 - 24:00
- Adresa: Elbasan, Shqipëri
- Telefon: Kontaktoni stafin në vend
- Wi-Fi: Falas për klientët
- Pagesa: Cash dhe karta bankare

Shërbimet:
- Kafe të ndryshme (espresso, macchiato, cappuccino, etj.)
- Pije të ftohta dhe kokteje
- Ëmbëlsira dhe snacks
- Shërbim në tavolinë

Përgjigju shkurt dhe qartë në shqip. Nëse nuk e di përgjigjen, thuaj që do të njoftosh stafin.`
      : `You are the virtual assistant of Boulevard Café Elbasan. Be friendly and helpful.

Café Information:
- Name: Boulevard Café Elbasan
- Hours: Monday - Sunday, 07:00 - 24:00
- Address: Elbasan, Albania
- Phone: Contact staff on-site
- Wi-Fi: Free for customers
- Payment: Cash and bank cards

Services:
- Various coffees (espresso, macchiato, cappuccino, etc.)
- Cold drinks and cocktails
- Desserts and snacks
- Table service

Reply briefly and clearly in English. If you don't know the answer, say you'll notify the staff.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Shumë kërkesa. Provoni përsëri më vonë." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Shërbimi i AI nuk është i disponueshëm." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Gabim në shërbimin AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("staff-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Gabim i panjohur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
