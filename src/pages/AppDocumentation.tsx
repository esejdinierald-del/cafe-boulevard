import { Button } from "@/components/ui/button";
import { Printer, Mail, ArrowLeft, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import emailjs from "@emailjs/browser";
import { toast } from "sonner";

const AppDocumentation = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      // Fetch source code file
      let sourceCode = "";
      try {
        const res = await fetch("/boulevard-source-code.txt");
        if (res.ok) sourceCode = await res.text();
      } catch { /* ignore */ }

      // EmailJS has ~50KB limit per message, so split into chunks
      const MAX_CHUNK = 45000; // safe limit
      const parts: string[] = [];
      
      if (sourceCode.length > 0) {
        // Split source code into chunks at line boundaries
        let remaining = sourceCode;
        while (remaining.length > 0) {
          if (remaining.length <= MAX_CHUNK) {
            parts.push(remaining);
            break;
          }
          // Find last newline before MAX_CHUNK
          let splitAt = remaining.lastIndexOf("\n", MAX_CHUNK);
          if (splitAt <= 0) splitAt = MAX_CHUNK;
          parts.push(remaining.slice(0, splitAt));
          remaining = remaining.slice(splitAt);
        }
      }

      const totalEmails = parts.length;
      let sent = 0;

      for (let i = 0; i < parts.length; i++) {
        const partLabel = totalEmails > 1 ? ` [Pjesa ${i + 1}/${totalEmails}]` : "";
        const header = i === 0 
          ? `═══════════════════════════════════════════════════
  BOULEVARD CAFÉ - KODI I PLOTË BURIMOR & LLOGJIKA
  ⚠️ KY EMAIL ËSHTË KONFIDENCIAL${partLabel}
═══════════════════════════════════════════════════

📋 RENDITUR SIPAS RADHËS:
1. Routing & Struktura (App.tsx)
2. Faqet: Index, Menu, Dashboard, StaffShift, ManagerLogin, ManagerDashboard
3. Komponentët: StaffChatDialog, FeedbackDialog, WelcomeGreeting, QrScanner, SplashScreen
4. Hooks: use-language, use-geolocation, use-chat-session, use-mobile
5. Ikonat Custom SVG
6. Edge Functions: staff-chat, manage-shift, validate-shift, unlock-shift, complete-request, send-push, push-subscribe, cleanup-chat-sessions
7. CSS & Stili: boulevard.css, index.css
8. Config: tailwind, vite, manifest, service worker
9. UI Components: button variants

══════════════════════════════════════
  🔑 AKSES & LIDHJE KRYESORE
══════════════════════════════════════
• Faqja kryesore: /?table=1 (deri 4)
• Menu: /menu?tabela=1
• Dashboard Stafi: /dashboard (fjalëkalimi: 2025)
• Staff PWA: /staff?token=<shift_token>
• Manager Login: /manager-login
• Manager Panel: /manager
• Dokumentacioni: /dokumentacion
• Install PWA: /install
• Email menaxher: e.sejdini.erald@gmail.com, sejdinierald@gmail.com

══════════════════════════════════════
  📦 KODI BURIMOR FILLON MË POSHTË
══════════════════════════════════════

` + parts[i]
          : `═══════════════════════════════════════════════════
  BOULEVARD CAFÉ - KODI BURIMOR${partLabel}
═══════════════════════════════════════════════════

` + parts[i];

        await emailjs.send(
          "service_xmc16rp",
          "template_wypkuuj",
          {
            to_email: "e.sejdini.erald@gmail.com",
            subject: `Boulevard Café - Kodi i Plotë PRIVATE 🔐${partLabel}`,
            message: header,
          },
          "KVuhr6VPEuMlgF25C"
        );
        sent++;
        
        // Small delay between emails to avoid rate limits
        if (i < parts.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      
      toast.success(`✅ ${sent} email${sent > 1 ? 'e' : ''} u dërgua${sent > 1 ? 'n' : ''} me sukses te e.sejdini.erald@gmail.com!`);
    } catch (error) {
      console.error("EmailJS error:", error);
      toast.error("❌ Gabim gjatë dërgimit. Provo përsëri.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a]">
      {/* Top Bar */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e8e0d4] px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-[#8a7a5a] hover:text-[#5a4a2a] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Kthehu
        </button>
        <div className="flex gap-2">
          <Button onClick={handleSendEmail} disabled={sending} size="sm" className="gap-2 bg-[#2d1b15] text-[#e8dcc0] hover:bg-[#3d2418] border-none text-xs">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {sending ? "Duke dërguar..." : "Dërgo Private 🔐"}
          </Button>
          <a href="/boulevard-source-code.txt" download="boulevard-source-code.txt">
            <Button size="sm" className="gap-2 bg-[#1a5c2e] text-white hover:bg-[#246b38] border-none text-xs">
              <Download className="h-3.5 w-3.5" />
              Shkarko Kodin 📦
            </Button>
          </a>
          <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2 border-[#c9a35c] text-[#5a4a2a] hover:bg-[#f5f0e8] text-xs">
            <Printer className="h-3.5 w-3.5" />
            Printo A4
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-[210mm] mx-auto px-8 pt-20 pb-12 print:pt-0 print:px-[15mm] print:max-w-none">

        {/* Header */}
        <header className="text-center mb-10 pb-6 border-b-2 border-[#c9a35c]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
            background: 'linear-gradient(145deg, #2d1b15, #1a0f0c)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>
            <svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="#e8c76d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 10h28L27 24v12h3.5a1.5 1.5 0 0 1 1.5 1.5V39H16v-1.5a1.5 1.5 0 0 1 1.5-1.5H21V24L10 10z" />
              <line x1="10" y1="10" x2="38" y2="10" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-wide text-[#2d1b15]" style={{ fontFamily: "'Playfair Display', serif" }}>
            BOULEVARD CAFÉ
          </h1>
          <h2 className="text-lg text-[#8a7a5a] mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
            Dokumentacion i Sistemit
          </h2>
          <p className="text-xs text-[#b0a080] mt-2 tracking-wider uppercase">
            Versioni 2.0 · Prill 2026
          </p>
        </header>

        {/* ═══ PËRMBLEDHJE ═══ */}
        <section className="mb-10">
          <div className="rounded-xl p-5 mb-6" style={{
            background: 'linear-gradient(135deg, #2d1b15 0%, #1a0f0c 100%)',
            color: '#e8dcc0',
          }}>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#e8c76d' }}>
              Përmbledhje e Sistemit
            </h3>
            <p className="text-sm leading-relaxed opacity-80">
              Boulevard Café është një sistem i plotë dixhital për menaxhimin e restorantit. 
              Klientët skanojnë kodin QR në tavolinë, shfletojnë menunë, porosisin, 
              thërrasin kamarierin ose kërkojnë faturën — të gjitha nga telefoni. 
              Stafi merr njoftimet në kohë reale përmes dashboard-it, ndërsa menaxheri 
              kontrollon menunë, ofertat dhe bazen e njohurive AI.
            </p>
          </div>
          <div className="rounded-xl border-2 border-dashed border-[#c8b0e0] p-4 text-center bg-[#f8f4fc] print:hidden">
            <p className="text-xs text-[#6a5a8a]">
              <strong>🔐 Menaxheri, databaza, siguria, edge functions</strong> — të gjitha informacionet private dërgohen vetëm me email.
              Kliko <strong>"Dërgo Private 🔐"</strong> lart djathtas.
            </p>
          </div>
        </section>

        {/* ═══ KLIENTI ═══ */}
        <section className="mb-10">
          <SectionHeader icon="👤" title="KLIENTI" subtitle="Rol publik · Akses përmes QR kodit në tavolinë" color="#f5e6c8" colorEnd="#e8d5a8" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DocCard icon="📋" title="Shikimi i Menusë" items={[
              "Shfletim i kategorive me emra shqip/anglisht",
              "Produkte me foto (Storage: menu-images bucket), çmime, përshkrime",
              "Filtrim sipas kategori_id (tabela categories → menu_items)",
              "Mbështetje dygjuhëshe: useLanguage() hook → localStorage",
              "Oferta aktive: offer_price shfaqet kur ora aktuale bie në offer_start_time–offer_end_time (timezone Europe/Rome)",
            ]} />
            <DocCard icon="🛒" title="Porositja" items={[
              "Shporta në useState (Cart state lokal në /menu)",
              "Modifikim i sasive, shtim shënimesh",
              "supabase.from('orders').insert({items, total_price, table_number, status:'pending'})",
              "GPS verifikim: useGeolocation() → Haversine ≤ 75m",
              "Nëse jashtë rrezes: 'Duhet të jeni fizikisht në lokal'",
            ]} />
            <DocCard icon="🔔" title="Kërkesa Shërbimi" items={[
              "Buton 'Thirr Kamerieren' → service_requests INSERT (request_type: 'waiter')",
              "Buton 'Kërko Faturën' → service_requests INSERT (request_type: 'bill')",
              "GPS verifikim para dërgimit (75m rreze)",
              "Identifikim i tavolinës nga URL param: ?table=X",
              "Realtime: stafi merr njoftim automatik",
            ]} />
            <DocCard icon="💬" title="Chat me AI" items={[
              "Dialogu StaffChatDialog → Edge Function: staff-chat",
              "Model: google/gemini-2.5-flash (Lovable AI Gateway)",
              "Streaming: SSE (Server-Sent Events) me reader.read() loop",
              "Kontekst: ai_knowledge tabela + menu_items + football API",
              "Sesion: useChatSession() → chat_sessions tabela, TTL 10 min",
              "Biseda e re: fshin session_id nga localStorage + DB",
            ]} />
            <DocCard icon="⭐" title="Vlerësimi (Feedback)" items={[
              "Dialog FeedbackDialog me yje 1-5 (klikohet)",
              "Koment opsional (textarea)",
              "supabase.from('feedback').insert({rating, comment, table_number})",
              "Ruajtje automatike me numrin e tavolinës nga URL",
              "Shikimi nga menaxheri në panelin /manager",
            ]} />
            <DocCard icon="📍" title="GPS Geofencing" items={[
              "Hook: useGeolocation() → navigator.geolocation.getCurrentPosition()",
              "Koordinata kafesë: 41.114871, 20.088804",
              "Rreze maksimale: 75 metra (MAX_DISTANCE_METERS)",
              "Formula Haversine: getDistanceInMeters(lat1, lon1, lat2, lon2)",
              "Opsionet: enableHighAccuracy=true, timeout=10s, maximumAge=60s",
              "Gabime: PERMISSION_DENIED → mesazh shqip/anglisht",
            ]} />
          </div>

          {/* Code Logic: Client Flow */}
          <div className="mt-6 rounded-xl border border-[#e8e0d4] p-5 bg-white">
            <h4 className="font-bold text-[#2d1b15] mb-3 text-xs uppercase tracking-wider">📐 Llogjika e Klientit — Diagramë</h4>
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs mb-4">
              <FlowStep label="Skanim QR" />
              <FlowArrow />
              <FlowStep label="/?table=X" />
              <FlowArrow />
              <FlowStep label="GPS Check ≤75m" />
              <FlowArrow />
              <FlowStep label="Shiko Menunë" />
              <FlowArrow />
              <FlowStep label="Porosit / Thirr" />
              <FlowArrow />
              <FlowStep label="Supabase INSERT" highlight />
            </div>
            <div className="text-xs text-[#5a4a3a] space-y-2 bg-[#faf8f4] rounded-lg p-4 font-mono">
              <p className="text-[#8a7a5a] font-sans font-medium mb-2">Kodi kryesor (Index.tsx):</p>
              <p>1. URL param: <Code>searchParams.get("table")</Code> → setTableNumber</p>
              <p>2. Staff PWA redirect: <Code>isStandaloneMode() && localStorage("staff_shift_token")</Code> → /staff</p>
              <p>3. Porosi: <Code>supabase.from("service_requests").insert({"{"} table_number, request_type, status: "pending" {"}"})</Code></p>
              <p>4. Menu navigate: <Code>navigate(`/menu?table=${"{"} tableNumber {"}"}`)</Code></p>
              <p>5. Chat: <Code>StaffChatDialog</Code> → fetch staff-chat EF → SSE stream → setMessages()</p>
              <p>6. Feedback: <Code>FeedbackDialog</Code> → supabase.from("feedback").insert()</p>
            </div>
          </div>
        </section>

        {/* ═══ STAFI ═══ */}
        <section className="mb-10">
          <SectionHeader icon="👔" title="STAFI / KAMARIERI" subtitle="Akses: /dashboard (QR) + /staff (PWA me token turni)" color="#d0e0f0" colorEnd="#b0c8e0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DocCard icon="📊" title="Dashboard (/dashboard)" items={[
              "Pamje e porosive aktive (status='pending')",
              "Pamje e kërkesave waiter/bill (status='pending')",
              "Badge me numrin e pending items",
              "Timer ElapsedBadge: <2min=normal, 2-5min=warning, >5min=red",
              "Supabase Realtime: .on('postgres_changes', {event:'*', table:'orders'})",
              "QR Curtain: shfaq QR me link /staff?token=X para aktivizimit",
            ]} />
            <DocCard icon="🔔" title="Sistem Njoftimesh" items={[
              "Mënyra 1: Text-to-Speech (SpeechSynthesis API) — zë i përshtatshëm",
              "Mënyra 2: Tingull alarmi (bell sound)",
              "Web Push Notifications: VAPID + service worker",
              "Push subscribe: push-subscribe EF → push_subscriptions tabela",
              "Përsëritje: çdo 30 sekonda për pending items",
              "Title blink: dokument.title ndryshon me interval kur ka pending",
            ]} />
            <DocCard icon="📝" title="Menaxhimi i Porosive" items={[
              "Shënim si 'Completed': complete-request Edge Function",
              "EF përdor service_role key (bypasses RLS)",
              "Anulim/fshirje e porosive",
              "Shikimi i detajeve: artikuj, sasi, shënime, çmim total",
              "Swipe-to-complete (touch events) në PWA",
              "Identifikim sipas numrit të tavolinës",
            ]} />
            <DocCard icon="📱" title="PWA e Stafit (/staff)" items={[
              "Manifest: /staff-manifest.webmanifest (start_url: /staff)",
              "Service Worker: /staff-sw.js",
              "Token turni ruhet në localStorage('staff_shift_token')",
              "Validim: validate-shift EF → kontrollon token + shift_end > now()",
              "Zhbllokim: unlock-shift EF → fjalëkalimi '2025'",
              "Pas turnit: token skadon, PWA shfaq 'Turni ka mbaruar'",
            ]} />
          </div>

          {/* Code Logic: Staff Flow */}
          <div className="mt-6 rounded-xl border border-[#e8e0d4] p-5 bg-white">
            <h4 className="font-bold text-[#2d1b15] mb-3 text-xs uppercase tracking-wider">📐 Llogjika e Stafit — Diagramë</h4>
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs mb-4">
              <FlowStep label="/dashboard" />
              <FlowArrow />
              <FlowStep label="manage-shift EF" />
              <FlowArrow />
              <FlowStep label="QR: /staff?token=X" />
              <FlowArrow />
              <FlowStep label="Skanim nga tel." />
              <FlowArrow />
              <FlowStep label="validate-shift" />
              <FlowArrow />
              <FlowStep label="unlock-shift (2025)" highlight />
            </div>

            <div className="text-xs text-[#5a4a3a] space-y-2 bg-[#faf8f4] rounded-lg p-4 font-mono">
              <p className="text-[#8a7a5a] font-sans font-medium mb-2">Llogjika e turnit (Dashboard.tsx + StaffShift.tsx):</p>
              <p>1. Dashboard hapet → <Code>ensureShiftToken()</Code> → manage-shift EF</p>
              <p>2. Turnet: <Code>03:00–15:00</Code> dhe <Code>15:00–03:00</Code> (llogaritja me Date)</p>
              <p>3. EF manage-shift: get_or_create → kërkon token ekzistues ose krijon të ri</p>
              <p>4. QR gjenerohet: <Code>{"<QRCodeSVG value={staffUrl} />"}</Code></p>
              <p>5. Kamarieri skanon → /staff?token=X → validate-shift EF kontrollon:</p>
              <p className="pl-4">a. Token ekziston në shift_tokens?</p>
              <p className="pl-4">b. shift_end {">"} now()? (nuk ka skaduar)</p>
              <p className="pl-4">c. Kthehet: {"{"} valid, shift_end, unlocked {"}"}</p>
              <p>6. Nëse valid + !unlocked → shfaq formë fjalëkalimi → unlock-shift EF</p>
              <p>7. Pas zhbllokimit: Realtime subscribe, Push subscribe, Audio enable</p>
              <p>8. Kur shift_end arrihet → <Code>"Turni ka mbaruar"</Code> + pastrim localStorage</p>
            </div>
          </div>

          {/* Realtime & Push Logic */}
          <div className="mt-4 rounded-xl border border-[#e8e0d4] p-5 bg-white">
            <h4 className="font-bold text-[#2d1b15] mb-3 text-xs uppercase tracking-wider">⚡ Realtime + Push Notifications</h4>
            <div className="text-xs text-[#5a4a3a] space-y-2 bg-[#faf8f4] rounded-lg p-4 font-mono">
              <p className="text-[#8a7a5a] font-sans font-medium mb-2">Si funksionojnë njoftimet:</p>
              <p>1. <Code>supabase.channel('staff-orders').on('postgres_changes', ...)</Code></p>
              <p>2. Event INSERT në orders/service_requests → trigger njoftim</p>
              <p>3. Voice: <Code>speechSynthesis.speak(new SpeechSynthesisUtterance(text))</Code></p>
              <p>4. Push: <Code>send-push EF</Code> → web-push library → endpoint i regjistruar</p>
              <p>5. Subscribe: <Code>PushManager.subscribe({"{"} applicationServerKey: VAPID_KEY {"}"})</Code></p>
              <p>6. Repeat timer: <Code>setInterval(playNotification, 30000)</Code> për pending</p>
              <p>7. Pas turnit: <Code>channel.unsubscribe()</Code> + ndalim i njoftimeve</p>
            </div>
          </div>
        </section>

        {/* ═══ ARKITEKTURA E SHKURTËR ═══ */}
        <section className="mb-10">
          <SectionHeader icon="🏗️" title="ARKITEKTURA" subtitle="Stack teknik (detaje të plota në email)" color="#d4e8d0" colorEnd="#b0d8a8" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-6">
            <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white">
              <h4 className="font-bold text-[#2d1b15] mb-2 text-xs uppercase tracking-wider">Frontend</h4>
              <ul className="space-y-1.5 text-[#5a4a3a]">
                <li className="flex items-center gap-2"><Dot color="#c9a35c" />React 18 + TypeScript</li>
                <li className="flex items-center gap-2"><Dot color="#c9a35c" />Vite 5 (Build Tool)</li>
                <li className="flex items-center gap-2"><Dot color="#c9a35c" />Tailwind CSS v3</li>
                <li className="flex items-center gap-2"><Dot color="#c9a35c" />React Router v6</li>
                <li className="flex items-center gap-2"><Dot color="#c9a35c" />TanStack Query v5</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white">
              <h4 className="font-bold text-[#2d1b15] mb-2 text-xs uppercase tracking-wider">Backend</h4>
              <ul className="space-y-1.5 text-[#5a4a3a]">
                <li className="flex items-center gap-2"><Dot color="#6a9fd8" />Lovable Cloud</li>
                <li className="flex items-center gap-2"><Dot color="#6a9fd8" />PostgreSQL Database</li>
                <li className="flex items-center gap-2"><Dot color="#6a9fd8" />7 Edge Functions (Deno)</li>
                <li className="flex items-center gap-2"><Dot color="#6a9fd8" />Realtime Subscriptions</li>
                <li className="flex items-center gap-2"><Dot color="#6a9fd8" />Storage (menu-images)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white">
              <h4 className="font-bold text-[#2d1b15] mb-2 text-xs uppercase tracking-wider">AI & Siguria</h4>
              <ul className="space-y-1.5 text-[#5a4a3a]">
                <li className="flex items-center gap-2"><Dot color="#c06080" />Gemini 2.5 Flash (AI)</li>
                <li className="flex items-center gap-2"><Dot color="#c06080" />RLS në 10 tabela</li>
                <li className="flex items-center gap-2"><Dot color="#c06080" />GPS Geofencing 75m</li>
                <li className="flex items-center gap-2"><Dot color="#c06080" />Web Push (VAPID)</li>
                <li className="flex items-center gap-2"><Dot color="#c06080" />PWA + Service Worker</li>
              </ul>
            </div>
          </div>
        </section>



        {/* Footer */}
        <footer className="text-center pt-6 mt-10 border-t-2 border-[#c9a35c]">
          <p className="text-xs text-[#8a7a5a] tracking-wider uppercase">
            Boulevard Café · Sistem i Menaxhimit të Restorantit
          </p>
          <p className="text-xs text-[#b0a080] mt-1">
            Zhvilluar me Lovable · © 2026
          </p>
        </footer>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

/* ═══ REUSABLE COMPONENTS ═══ */

const SectionHeader = ({ icon, title, subtitle, color, colorEnd }: { icon: string; title: string; subtitle: string; color: string; colorEnd: string }) => (
  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e8e0d4]">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
      background: `linear-gradient(135deg, ${color}, ${colorEnd})`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>{icon}</div>
    <div>
      <h3 className="text-xl font-bold text-[#2d1b15]" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      <p className="text-xs text-[#8a7a5a]">{subtitle}</p>
    </div>
  </div>
);

const DocCard = ({ icon, title, items }: { icon: string; title: string; items: string[] }) => (
  <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white hover:shadow-md transition-shadow">
    <h4 className="font-bold text-[#2d1b15] mb-2.5 flex items-center gap-2">
      <span>{icon}</span> {title}
    </h4>
    <ul className="space-y-1.5 text-[#5a4a3a]">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a35c] mt-1.5 flex-shrink-0" />
          <span className="text-[13px] leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-[#2d1b15] text-[#e8c76d] px-1.5 py-0.5 rounded text-[11px] font-mono">{children}</code>
);

const Dot = ({ color }: { color: string }) => (
  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
);

const RouteRow = ({ route, desc, access }: { route: string; desc: string; access: string }) => (
  <tr className="border-t border-[#f0ebe0] hover:bg-[#faf8f4] transition-colors">
    <td className="px-4 py-2.5 font-mono text-xs text-[#c9a35c] font-medium">{route}</td>
    <td className="px-4 py-2.5 text-[#5a4a3a]">{desc}</td>
    <td className="px-4 py-2.5">
      <span className="text-xs px-2 py-0.5 rounded-full bg-[#f5f0e8] text-[#8a7a5a] font-medium">{access}</span>
    </td>
  </tr>
);

const FlowStep = ({ label, highlight }: { label: string; highlight?: boolean }) => (
  <div className={`px-3 py-2 rounded-lg font-medium ${
    highlight 
      ? 'bg-[#2d1b15] text-[#e8c76d]' 
      : 'bg-[#f5f0e8] text-[#5a4a3a]'
  }`}>
    {label}
  </div>
);

const FlowArrow = () => (
  <span className="text-[#c9a35c] font-bold">→</span>
);

export default AppDocumentation;
