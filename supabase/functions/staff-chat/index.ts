import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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

// Fetch latest Albanian football news from Panorama Sport
async function fetchPanoramaSport(): Promise<string> {
  try {
    const urls = [
      "https://www.betexplorer.com/football/albania/abissnet-superiore/",
      "https://www.panorama.com.al/sport/category/kategoria-superiore/",
      "https://www.panorama.com.al/sport/category/elbasani/"
    ];

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BoulevardCafe/1.0)" },
        });
        if (!res.ok) return "";
        return await res.text();
      })
    );

    let articles: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status !== "fulfilled" || !result.value) {
        console.warn(`Panorama fetch ${i} failed:`, result.status === "rejected" ? result.reason : "empty");
        continue;
      }
      const html = result.value;
      console.log(`Panorama fetch ${i}: got ${html.length} chars`);

      // Extract titles from multiple patterns
      // Pattern 1: <h2><a href="...">Title</a></h2>
      // Pattern 2: <h2><a href="..."><strong>Title</strong></a></h2>  
      // Pattern 3: <h4> variants
      const patterns = [
        /<(?:h2|h4)[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/(?:h2|h4)>/gi,
        /<(?:h2|h4)[^>]*>([\s\S]*?)<\/(?:h2|h4)>/gi,
      ];

      for (const regex of patterns) {
        let match;
        while ((match = regex.exec(html)) !== null) {
          let title = match[1]
            .replace(/<[^>]*>/g, "") // Remove HTML tags
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#8220;|&#8221;/g, '"')
            .replace(/&#8230;/g, "...")
            .replace(/\s+/g, " ")
            .trim();
          if (title.length > 15 && !articles.includes(title)) {
            articles.push(title);
          }
        }
      }
    }

    console.log(`Panorama Sport: found ${articles.length} articles total`);

    if (articles.length === 0) {
      console.warn("No articles found from Panorama Sport");
      return "";
    }

    // Take the latest 20 articles
    const latest = articles.slice(0, 20);
    let info = "\n📰 LAJMET MË TË FUNDIT NGA PANORAMA SPORT (panorama.com.al/sport) - TË DHËNA 100% REALE:\n";
    for (const article of latest) {
      info += `- ${article}\n`;
    }
    info += "\n⚠️ RREGULL: Këto tituj janë fakte REALE nga panorama.com.al/sport. Përdori kështu:\n";
    info += "- Nëse pyeten për Elbasanin, shiko titujt që përmendin 'Elbasani' dhe përgjigju bazuar në to\n";
    info += "- Nëse pyeten për renditje/pikë specifike që NUK gjenden në tituj, thuaj: 'Nuk kam pikë të sakta tani, por sipas lajmeve të fundit nga panorama.com.al/sport...' dhe referoju titujve\n";
    info += "- KURRË mos shpik numra pikësh ose renditje!\n";
    info += "- Elbasani luan në ABISSNET SUPERIORE (liga e parë e Shqipërisë) - JO në kategori të ulëta!";
    return info;
  } catch (e) {
    console.error("Error fetching Panorama Sport:", e);
    return "";
  }
}

// Fetch active offers from menu_items
async function fetchActiveOffers(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    // Format current time in Europe/Rome timezone as HH:MM
    const romeTime = now.toLocaleTimeString("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });

    const { data: items, error } = await sb
      .from("menu_items")
      .select("name, name_en, price, offer_price, offer_start_time, offer_end_time, category_id, categories(name, name_en)")
      .not("offer_price", "is", null);

    if (error || !items || items.length === 0) return "";

    // Filter active offers based on current Rome time
    const activeOffers = items.filter((item: any) => {
      if (!item.offer_start_time || !item.offer_end_time) return false;
      return romeTime >= item.offer_start_time && romeTime < item.offer_end_time;
    });

    const upcomingOffers = items.filter((item: any) => {
      if (!item.offer_start_time || !item.offer_end_time) return false;
      return romeTime < item.offer_start_time;
    });

    let info = "\n🔥 OFERTAT E SOTME (TË DHËNA REALE NGA DATABAZA):\n";

    if (activeOffers.length > 0) {
      info += "AKTIVE TANI:\n";
      for (const item of activeOffers) {
        const cat = (item as any).categories?.name || "";
        info += `- ${item.name} (${cat}): ${item.offer_price}€ (çmimi normal: ${item.price}€) — deri në ${item.offer_end_time}\n`;
      }
    }

    if (upcomingOffers.length > 0) {
      info += "DO TË AKTIVIZOHEN SË SHPEJTI:\n";
      for (const item of upcomingOffers) {
        const cat = (item as any).categories?.name || "";
        info += `- ${item.name} (${cat}): ${item.offer_price}€ (çmimi normal: ${item.price}€) — nga ${item.offer_start_time} deri ${item.offer_end_time}\n`;
      }
    }

    if (activeOffers.length === 0 && upcomingOffers.length === 0) {
      // All offers have expired for today
      info += "Sot nuk ka oferta aktive për momentin.\n";
    }

    info += `\nOra aktuale (Rome): ${romeTime}\n`;
    info += "⚠️ Kur pyesin klientët për oferta, përdor VETËM këto të dhëna reale! Thuaju orarin dhe çmimin e saktë.\n";
    return info;
  } catch (e) {
    console.error("Error fetching offers:", e);
    return "";
  }
}

// Fetch full menu with prices from database
async function fetchFullMenu(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: items, error } = await sb
      .from("menu_items")
      .select("name, name_en, price, available, category_id, categories(name, name_en)")
      .eq("available", true)
      .order("display_order", { ascending: true });

    if (error || !items || items.length === 0) return "";

    // Group by category
    const grouped: Record<string, { name: string; name_en: string; items: any[] }> = {};
    for (const item of items) {
      const cat = (item as any).categories;
      const catName = cat?.name || "Të tjera";
      const catNameEn = cat?.name_en || "Other";
      if (!grouped[catName]) {
        grouped[catName] = { name: catName, name_en: catNameEn, items: [] };
      }
      grouped[catName].items.push(item);
    }

    let info = "\n📋 MENU E PLOTË (ÇMIME REALE NGA DATABAZA - NË LEKË):\n";
    for (const [catName, cat] of Object.entries(grouped)) {
      info += `\n${catName} (${cat.name_en}):\n`;
      for (const item of cat.items) {
        info += `- ${item.name}${item.name_en ? ` / ${item.name_en}` : ""}: ${item.price} Lekë\n`;
      }
    }
    info += "\n⚠️ RREGULL: Përdor VETËM këto çmime kur pyesin klientët! Monedha është LEKË (jo euro).\n";
    return info;
  } catch (e) {
    console.error("Error fetching full menu:", e);
    return "";
  }
}

// Fetch custom knowledge entries
async function fetchCustomKnowledge(): Promise<string> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: entries, error } = await sb
      .from("ai_knowledge")
      .select("title, content")
      .order("created_at", { ascending: false });

    if (error || !entries || entries.length === 0) return "";

    let info = "\n📚 INFORMACIONE SHTESË NGA MENAXHERI:\n";
    for (const entry of entries) {
      info += `\n### ${entry.title}\n${entry.content}\n`;
    }
    info += "\n⚠️ Përdor këto informacione kur klientët pyesin për temat përkatëse.\n";
    return info;
  } catch (e) {
    console.error("Error fetching custom knowledge:", e);
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

    // Fetch live data in parallel
    const [footballData, panoramaData, offersData, knowledgeData] = await Promise.all([
      fetchFootballData(),
      fetchPanoramaSport(),
      fetchActiveOffers(),
      fetchCustomKnowledge(),
    ]);

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

🏟️ AF ELBASANI - EKIPI YNË I ZEMRËS (FAKT I KONFIRMUAR):
- AF Elbasani aktualisht luan NË Abissnet Superiore (liga e parë e futbollit shqiptar, elita!)
- NUK luan në Kategorinë e Parë apo Dytë - TASHMË është NË elitë!
- Është ekipi i qytetit tonë Elbasan dhe ne e mbështesim me gjithë zemër!
- Sipas lajmeve, Elbasani ka shanse edhe për titullin kampion!
- Kur pyetesh për Elbasanin, referoju lajmeve nga panorama.com.al/sport
- KUJDES: Titulli "Lufta për Superioren" i referohet ekipeve TË TJERA që duan të ngjiten - JO Elbasanit!
${offersData}
${footballData}
${panoramaData}
${knowledgeData}

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
- PËR KAMPIONATIN SHQIPTAR (Kategoria Superiore, Kategoria e Parë, Kategoria e Dytë), ekipet shqiptare (Tirana, Partizani, Vllaznia, Egnatia, Bylis, Teuta, Elbasani, Dinamo, Flamurtari, Vora, etj.):
  * KËRKO NË WEB duke përdorur faqet: panorama.com.al/sport, supersport.al, fshf.org, sofascore.com
  * Jep VETËM informacionin që gjen drejtpërdrejt nga këto burime
  * Përmend gjithmonë burimin: "sipas panorama.com.al" ose "sipas supersport.al"
- Ji entuziastik - "Eja shiko ndeshjen me ne! Birra e ftohtë po të pret!"
- Sugjeroji finger food dhe birra kur flitet për ndeshje
- Nëse nuk ka ndeshje sot, thuaj kur është ndeshja e radhës
- ⚠️ RREGULL ABSOLUT: KURRË mos shpik rezultate, renditje, pikë, ose statistika! Nëse nuk gjen informacion të qartë nga burimet e mësipërme, thuaj: "Nuk gjeta informacion të saktë tani, por kontrollo panorama.com.al/sport ose supersport.al për lajmet më të fundit!"
- Është MË MIRË të thuash "nuk e di" sesa të japësh informacion të gabuar - klientët na besojnë!
🌐 KËRKIM NË WEB:
- Nëse klienti pyet për diçka jashtë menusë ose lokalit (lajme, moti, ngjarje, info të përgjithshme, çmime, etj.), kërko në web dhe përgjigju me të dhëna të sakta
- Gjithmonë lidh përgjigjen me Boulevard Café kur është e mundur (p.sh. "Moti sot është i bukur - perfekt për një kafe në tarracën tonë!")
- Ji i sinqertë nëse nuk gjen informacion - mos shpik`;

    const systemPromptEn = `You are the virtual assistant of Boulevard Café Elbasan - a friendly buddy who loves this place!

🎯 YOUR PERSONALITY: Talk like a friend, use emojis, be enthusiastic about matches and food!

${offersData}
${footballData}
${panoramaData}
${knowledgeData}

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
- For ALBANIAN LEAGUE (Kategoria Superiore, Kategoria e Parë, Kategoria e Dytë), Albanian teams (Tirana, Partizani, Vllaznia, Egnatia, Bylis, Teuta, Elbasani, Dinamo, Flamurtari, Vora, etc.):
  * SEARCH THE WEB using these sources: panorama.com.al/sport, supersport.al, fshf.org, sofascore.com
  * Only provide info you find directly from these sources
  * Always mention the source: "according to panorama.com.al" or "according to supersport.al"
- Be enthusiastic - "Come watch with us! Cold beer is waiting!"
- Suggest finger food and beer when talking about matches
- If no matches today, mention when the next one is
- ⚠️ ABSOLUTE RULE: NEVER make up results, standings, points, or statistics! If you can't find clear info from the sources above, say: "I couldn't find accurate info right now, but check panorama.com.al/sport or supersport.al for the latest!"
- It's BETTER to say "I don't know" than to give wrong information!

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
          search_context_size: "high",
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
