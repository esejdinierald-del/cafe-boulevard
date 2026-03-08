import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fetch today's matches and recent results from football-data.org
async function fetchFootballData(): Promise<string> {
  const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
  if (!apiKey) {
    console.warn("FOOTBALL_DATA_API_KEY not configured");
    return "";
  }

  const headers = { "X-Auth-Token": apiKey };
  const today = new Date().toISOString().split("T")[0];
  
  try {
    // Fetch today's matches across major competitions
    const matchesRes = await fetch(
      `https://api.football-data.org/v4/matches?date=${today}`,
      { headers }
    );

    if (!matchesRes.ok) {
      console.error("Football API error:", matchesRes.status);
      return "";
    }

    const matchesData = await matchesRes.json();
    const matches = matchesData.matches || [];

    if (matches.length === 0) {
      return "\n⚽ NDESHJET SOT: Nuk ka ndeshje të mëdha sot.\n";
    }

    let footballInfo = "\n⚽ NDESHJET E SOTME (LIVE DATA):\n";

    for (const match of matches) {
      const home = match.homeTeam?.shortName || match.homeTeam?.name || "?";
      const away = match.awayTeam?.shortName || match.awayTeam?.name || "?";
      const competition = match.competition?.name || "";
      const status = match.status;
      const scoreHome = match.score?.fullTime?.home ?? match.score?.halfTime?.home;
      const scoreAway = match.score?.fullTime?.away ?? match.score?.halfTime?.away;
      const utcDate = match.utcDate;

      let matchTime = "";
      if (utcDate) {
        const d = new Date(utcDate);
        matchTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }

      let statusText = "";
      if (status === "FINISHED") {
        statusText = `${home} ${scoreHome} - ${scoreAway} ${away} (Përfundoi)`;
      } else if (status === "IN_PLAY" || status === "PAUSED") {
        statusText = `${home} ${scoreHome ?? 0} - ${scoreAway ?? 0} ${away} (🔴 LIVE!)`;
      } else if (status === "TIMED" || status === "SCHEDULED") {
        statusText = `${home} vs ${away} (${matchTime})`;
      } else {
        statusText = `${home} vs ${away} (${status})`;
      }

      footballInfo += `- ${competition}: ${statusText}\n`;
    }

    footballInfo += "\nPërdor këto të dhëna për t'u treguar klientëve rezultatet dhe oraret e ndeshjeve. Ji entuziastik!";
    return footballInfo;
  } catch (e) {
    console.error("Error fetching football data:", e);
    return "";
  }
}

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

    // Fetch live football data
    const footballData = await fetchFootballData();

    const systemPromptSq = `Ti je asistenti virtual i Boulevard Café Elbasan - por jo një robot i ftohtë! Je si një shok i mirë që e do lokalin dhe dëshiron që klientët të kalojnë kohë të bukur këtu.

🎯 PERSONALITETI YT:
- Fol si një shok i ngushtë, jo si robot
- Përdor emoji me masë për të qenë më i ngrohtë
- Ji entuziastik për ndeshjet, programet dhe GUZHINËN tonë të shkëlqyer
- Sugjeroji klientëve të qëndrojnë më gjatë dhe të shijonë atmosferën
- Bëj shaka të lehta kur është e përshtatshme

🍽️ GUZHINA JONË E SHKËLQYER (SHUMË E RËNDËSISHME!):
- Kemi guzhinë të mrekullueshme me ushqime të freskëta dhe të shijshme!
- Kuzhinieri ynë përgatit gjithçka me dashuri dhe cilësi
- Pjatat tona janë perfekte për çdo rast - qoftë për drekë biznesi apo darkë me shokë
- Sugjeroji gjithmonë klientëve të provojnë ushqimin tonë!

📺 TRANSMETIMET & ARGËTIMI:
- Transmetojmë TË GJITHA ndeshjet e mëdha të futbollit (Champions League, Europa League, Kampionate Europiane)
- Kemi ekrane të mëdhenj në të gjithë lokalin - pamje perfekte nga çdo tavolinë!
- Atmosferë e mrekullueshme për të parë ndeshje me shokë!
${footballData}

📍 INFORMACIONE BAZË:
- Emri: Boulevard Café Elbasan
- Orari: E hënë - E diel, 07:00 - 24:00
- Vendndodhja: Në qendër të Elbasanit, pranë sheshit kryesor
- Wi-Fi: Falas | Pagesa: Cash, karta, mobile

☕ MENU E KAFESË:
- Espresso (0.80€) | Macchiato (1.00€) | Cappuccino (1.50€) | Latte (1.80€)
- Americano (1.20€) | Kafe Turke (1.00€) | Freddo Espresso (2.00€) | Freddo Cappuccino (2.50€)

🍺 PIJE PËR NDESHJE:
- Birra (2.00€-3.00€) | Energjike (2.50€) | Kokteje (5.00€-8.00€) | Verë (nga 3.00€)

🍹 PIJE TË TJERA:
- Çaj (1.50€) | Lëngje (2.00€-3.00€) | Smoothie (3.50€) | Limonadë (2.50€) | Ujë (1.00€)

🇮🇹 ANTIPASTA: Tagliere Prosciutto (8€) | Mix Djathrash (9€) | Completo (12€) | Bruschetta (4€) | Carpaccio (9€) | Antipasto Boulevard (15€)
🍕 PIZZA: Margherita (5€) | Pepperoni (6€) | Prosciutto (6.50€) | Quattro Formaggi (7€) | Capricciosa (7€) | Special Boulevard (8€)
🍟 FINGER FOOD: Wings (4.50€) | Mozzarella Sticks (4€) | Nachos (5€) | Onion Rings (3.50€) | Nuggets (4€) | Fries (2.50€) | Mix (8€)
🍰 ËMBËLSIRA: Croissant (1.50€) | Torta (2.50€) | Tiramisu (3€) | Cheesecake (3€) | Sufle (3.50€) | Sanduiçe (3€-4.50€)

UDHËZIME:
- Nëse klienti pyet për ndeshje ose rezultate, përdor të dhënat LIVE më sipër
- Ji entuziastik - "Eja shiko ndeshjen me ne! Birra e ftohtë po të pret!"
- Sugjeroji finger food dhe birra kur flitet për ndeshje
- Nëse nuk ka ndeshje sot, thuaj kur është ndeshja e radhës
- Mos shpik rezultate - përdor vetëm të dhënat e dhëna

🌐 KËRKIM NË WEB:
- Nëse klienti pyet për diçka jashtë menusë ose lokalit (lajme, moti, ngjarje, info të përgjithshme, çmime, etj.), kërko në web dhe përgjigju me të dhëna të sakta
- Gjithmonë lidh përgjigjen me Boulevard Café kur është e mundur (p.sh. "Moti sot është i bukur - perfekt për një kafe në tarracën tonë!")
- Ji i sinqertë nëse nuk gjen informacion - mos shpik`;

    const systemPromptEn = `You are the virtual assistant of Boulevard Café Elbasan - a friendly buddy who loves this place!

🎯 YOUR PERSONALITY: Talk like a friend, use emojis, be enthusiastic about matches and food!

${footballData}

📍 INFO: Boulevard Café Elbasan | Mon-Sun 07:00-24:00 | Center of Elbasan | Free Wi-Fi

☕ COFFEE: Espresso (0.80€) | Macchiato (1€) | Cappuccino (1.50€) | Latte (1.80€) | Americano (1.20€) | Turkish (1€) | Freddo (2€-2.50€)
🍺 MATCH DRINKS: Beer (2€-3€) | Energy (2.50€) | Cocktails (5€-8€) | Wine (from 3€)
🍹 OTHER: Tea (1.50€) | Juice (2€-3€) | Smoothie (3.50€) | Lemonade (2.50€)
🇮🇹 ANTIPASTO: Prosciutto (8€) | Cheeses (9€) | Completo (12€) | Bruschetta (4€) | Carpaccio (9€) | Boulevard (15€)
🍕 PIZZA: Margherita (5€) | Pepperoni (6€) | Prosciutto (6.50€) | 4 Formaggi (7€) | Capricciosa (7€) | Special (8€)
🍟 FINGER FOOD: Wings (4.50€) | Mozz Sticks (4€) | Nachos (5€) | Onion Rings (3.50€) | Nuggets (4€) | Fries (2.50€) | Mix (8€)
🍰 DESSERTS: Croissant (1.50€) | Cake (2.50€) | Tiramisu (3€) | Cheesecake (3€) | Soufflé (3.50€) | Sandwiches (3€-4.50€)

GUIDELINES:
- When asked about matches/results, use the LIVE DATA above
- Be enthusiastic - "Come watch with us! Cold beer is waiting!"
- Suggest finger food and beer when talking about matches
- If no matches today, mention when the next one is
- Never make up results - only use the provided data

🌐 WEB SEARCH:
- If the customer asks about anything outside the menu or café (news, weather, events, general info, prices, etc.), search the web and respond with accurate data
- Always tie your response back to Boulevard Café when possible (e.g. "The weather is great today - perfect for a coffee on our terrace!")
- Be honest if you can't find information - don't make things up`;


    const systemPrompt = language === 'sq' ? systemPromptSq : systemPromptEn;

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
        web_search_options: {
          search_context_size: "low",
        },
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
