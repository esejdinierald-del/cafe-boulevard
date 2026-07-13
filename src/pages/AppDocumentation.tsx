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
        <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-[#8a7a5a] hover:text-[#5a4a2a] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Kthehu
        </button>
        <div className="flex gap-2">
          <Button onClick={handleSendEmail} disabled={sending} size="sm" className="gap-2 bg-[#2d1b15] text-[#e8dcc0] hover:bg-[#3d2418] border-none text-xs">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {sending ? "Duke dërguar..." : "Dërgo Private 🔐"}
          </Button>
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

        {/* ═══ 1. FAQJA E KLIENTIT ═══ */}
        <section className="mb-10">
          <SectionHeader icon="📱" title="1. Faqja e Klientit" subtitle="QR në tavolinë → Menu → Porosi" color="#c9a35c" colorEnd="#8a6a2a" />
          <div className="space-y-3 text-sm text-[#3a2a1a] leading-relaxed">
            <p><strong>Hyrja:</strong> Klienti skanon QR-në në tavolinë. URL: <Code>/?table=1</Code> deri <Code>table=4</Code>. Nga aty kalon te <Code>/menu?tabela=X</Code>.</p>
            <p><strong>Cfarë mund të bëjë klienti:</strong></p>
            <ul className="space-y-1.5 ml-4">
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Shfleton menunë sipas kategorive (Kafe, Pije Freskuese, Kokteje, Antipasta, Mëngjes, etj.).</span></li>
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Porosit direkt nga menuja — porosia futet me status <Code>pending</Code>.</span></li>
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Klikon <strong>"Thirr Kamarierin"</strong> ose <strong>"Kërko Faturën"</strong>.</span></li>
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Ndryshon gjuhën SQ / EN me flamurin lart djathtas.</span></li>
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Lë vlerësim me yje (1–5) dhe koment pas shërbimit.</span></li>
            </ul>
            <p><strong>Ofertat:</strong> Kur një artikull ka çmim promocional aktiv, shfaqet me ikonën 🔥, çmimi i vjetër i vizatuar dhe një countdown deri në përfundim (edhe kur kalon mesnatën).</p>
            <p><strong>Print A4 / Preview:</strong> Menaxheri mund të hapë menunë në browser dhe të përdorë <Code>Ctrl+P</Code> → <em>Save as PDF</em> ose printo direkt në A4 për ta shfaqur si menu klasike.</p>
          </div>
        </section>

        {/* ═══ 2. RRUGA E KAMARIERIT ═══ */}
        <section className="mb-10">
          <SectionHeader icon="👨‍🍳" title="2. Rruga e Kamarierit — nga hyrja deri në mbyllje turnit" subtitle="Login PIN → POS → Mbyllje me admin pas 23:59" color="#8a5a3a" colorEnd="#5a3a1a" />
          <div className="space-y-4 text-sm text-[#3a2a1a] leading-relaxed">
            <div>
              <p className="font-semibold mb-1">Hap 1 — Hyrja me PIN</p>
              <p>Kamarieri hap <Code>/staff</Code> ose skanon QR-në personale. Fut PIN-in 4-shifror (p.sh. Elvi = <Code>2222</Code>). Sistemi krijon një <Code>shift_token</Code> të vlefshëm derisa kamarieri ta mbyllë turnin.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Hap 2 — POS / Arka</p>
              <p>Nga <Code>/pos</Code> zgjedh tavolinën → sheh kategoritë → zgjedh artikuj → konfirmon porosinë. Porosia shkon te banaku me status <Code>open</Code> dhe pulson derisa banakieri ta pranojë.</p>
              <ul className="ml-4 mt-1 space-y-1">
                <li className="flex gap-2"><Dot color="#8a5a3a" /><span>👁 shfaq çfarë është porositur në tavolinë.</span></li>
                <li className="flex gap-2"><Dot color="#8a5a3a" /><span>➖ heq artikuj — <strong>vetëm me passcode admin</strong>.</span></li>
                <li className="flex gap-2"><Dot color="#8a5a3a" /><span>🖨 Print & Close — printon biletën dhe mbyll tavolinën.</span></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">Hap 3 — Porositë nga /menu (klienti)</p>
              <p>Porositë nga QR-ja shfaqen te <Code>/staff</Code> me polling 3–5s. Kamarieri klikon <strong>Prano</strong> ose <strong>Refuzo</strong>.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Hap 4 — Regjistrimi Ditor</p>
              <p><Code>/regjistrimi-ditor</Code>: Fut <em>Gjendjen</em> aktuale të artikujve, sistemi kalkulon <Code>Dif = Shirit + Gjendje − StokFillim</Code>. OCR nga foto e mullirit lexon automatikisht kilogramët e kafesë.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Hap 5 — Mbyllja e turnit</p>
              <p className="mb-1">Butoni <strong>"Mbyll Turnin"</strong> (i kuq) është <strong>i bllokuar para orës 23:59 (Rome)</strong>. Pas kësaj kohe kamarieri e mbyll vetë.</p>
              <p>Përpara 23:59 — mbyllja kërkon <strong>passcode admin</strong>. Ora dhe data janë të lexuara nga serveri, pa mundësi ndryshimi lokal.</p>
            </div>
          </div>
        </section>

        {/* ═══ 3. DASHBOARD I BANAKUT ═══ */}
        <section className="mb-10">
          <SectionHeader icon="☕" title="3. Dashboard i Banakut & KDS" subtitle="/dashboard — pranimi, printimi, kuzhina" color="#6a4a2a" colorEnd="#3a2a1a" />
          <div className="space-y-3 text-sm text-[#3a2a1a] leading-relaxed">
            <p><strong>Hyrja:</strong> Në <Code>/dashboard</Code> kërkohet passcode-i i banakut. Faqja rifreskohet çdo 3 sekonda me <Code>list-orders</Code>.</p>
            <p><strong>Cfarë shfaq:</strong></p>
            <ul className="ml-4 space-y-1">
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Porositë <strong>pending</strong> me pulsim + tingull kur vjen porosia e re.</span></li>
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Numër tavoline, artikuj, sasi, kohë.</span></li>
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Butoni <strong>"Gati"</strong> → auto-print bileta + zbrit inventar sipas <Code>recipes</Code> + regjistron shitjen.</span></li>
              <li className="flex gap-2"><Dot color="#c9a35c" /><span>Kërkesat <em>Kamarier</em> / <em>Faturë</em> nga tavolinat.</span></li>
            </ul>
            <p><strong>KDS (Kuzhina):</strong> Kategoritë <em>Antipasta, Mëngjes, Pica, Sallata</em> shkojnë automatikisht te ekrani i kuzhinës me tingull <em>"Porosia Gati"</em> (5 beeps + vibration për 15s).</p>
            <p><strong>Print Station PC:</strong> <Code>/print-station</Code> konsumon <Code>print_jobs</Code> nga cloud → printeri fizik.</p>
          </div>
        </section>

        {/* ═══ 4. INVENTARI ═══ */}
        <section className="mb-10">
          <SectionHeader icon="📦" title="4. Inventari" subtitle="/inventory — materiale, furnizime, alerte" color="#4a6a3a" colorEnd="#2a4a1a" />
          <div className="space-y-3 text-sm text-[#3a2a1a] leading-relaxed">
            <p><strong>Materialet:</strong> Kafe, Coca Cola, Fanta, IVI, Çaj i ftohtë, Bravo, etj. Secili material ka <Code>quantity</Code>, <Code>unit</Code>, <Code>min_threshold</Code>.</p>
            <p><strong>Recetat:</strong> Cdo artikull menu-je lidhet me materialet përkatëse. Kur banakieri konfirmon porosinë, <Code>decrement_material</Code> zbret automatikisht sasinë.</p>
            <p><strong>Furnizimet:</strong> Në <Code>/inventory</Code> menaxheri fut disa rreshta furnizimi njëherësh me sasinë dhe shënimin. Historia mbahet te <Code>supplies</Code>.</p>
            <p><strong>Alerte:</strong> Kur <Code>quantity ≤ min_threshold</Code> shfaqet karta e kuqe <em>"Stok i Ulët"</em> për porosi urgjente.</p>
            <p><strong>Porosi Furnitor:</strong> <Code>/porosi-furnitor</Code> gjeneron listën e artikujve për t'i porositur furnitorit.</p>
          </div>
        </section>

        {/* ═══ 5. MENAXHERI ═══ */}
        <section className="mb-10">
          <SectionHeader icon="👑" title="5. Paneli i Menaxherit" subtitle="/manager — meny, staf, oferta, database" color="#5a3a6a" colorEnd="#2a1a3a" />
          <div className="space-y-4 text-sm text-[#3a2a1a] leading-relaxed">
            <div>
              <p className="font-semibold mb-1">Hyrja</p>
              <p><Code>/manager-login</Code> me email + fjalëkalim. Vetëm emailat me rol <Code>manager</Code>/<Code>admin</Code> te tabela <Code>user_roles</Code> kanë akses. Google OAuth i aktivizuar.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Si shtohet një artikull i ri</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Tab <strong>"Menuja"</strong> → <em>"Shto artikull"</em>.</li>
                <li>Zgjedh kategorinë, emri (SQ + EN), çmimi në Lekë, përshkrimi.</li>
                <li>Ngarko foto katrore (&lt;500KB, WebP/JPG) — foto reale preferohen.</li>
                <li>Aktivo <Code>available</Code> për ta shfaqur në menu.</li>
                <li>Rendit me <Code>display_order</Code> për pozicion manual.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1">Si bëhet një ofertë</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Hap artikullin → seksioni <em>"Ofertë"</em>.</li>
                <li>Vendos <Code>promo_price</Code>, <Code>promo_start</Code>, <Code>promo_end</Code> (mund të kalojë mesnatën).</li>
                <li>Ruaj → në menu shfaqet 🔥 me countdown; AI e njofton automatikisht.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1">Si shtohet një kamarier</p>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Tab <strong>"Stafi"</strong> → <em>"Shto"</em>.</li>
                <li>Emri, roli (<Code>waiter</Code>/<Code>bar</Code>/<Code>kitchen</Code>), PIN 4-shifror unik.</li>
                <li>Aktivo <Code>is_active</Code>. Kamarieri hyn te <Code>/staff</Code> me PIN-in e tij.</li>
                <li>Ndryshimi i PIN-it: hap kartën e stafit → <em>"Ndrysho PIN"</em>.</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1">Kategoritë</p>
              <p>Tab <strong>"Kategoritë"</strong> → shto/riemërto/fshi. Rendit me drag ose <Code>display_order</Code>.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Analiza</p>
              <p><Code>/analytics</Code> shfaq xhiron 30-ditore, top produkte, top tavolina. Vetëm menaxheri.</p>
            </div>
          </div>
        </section>

        {/* ═══ 6. ROUTES ═══ */}
        <section className="mb-10">
          <SectionHeader icon="🗺" title="6. Të gjitha faqet" subtitle="Cfarë bën secila rrugë" color="#3a5a6a" colorEnd="#1a3a4a" />
          <div className="rounded-xl overflow-hidden border border-[#e8e0d4]">
            <table className="w-full text-sm">
              <thead className="bg-[#faf6ec] text-[#5a4a2a]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider">Rruga</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider">Përshkrim</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider">Akses</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <RouteRow route="/?table=1..4" desc="Landing i klientit nga QR" access="Publik" />
                <RouteRow route="/menu?tabela=X" desc="Menu, oferta, thirrje kamarier/faturë" access="Publik" />
                <RouteRow route="/dashboard" desc="Banaku: pranim porosish, print, KDS" access="Passcode" />
                <RouteRow route="/staff" desc="Kamarier: login PIN, kërkesa klientësh" access="PIN" />
                <RouteRow route="/pos" desc="Arka: tavolina + porosi + mbyllje" access="Shift token" />
                <RouteRow route="/inventory" desc="Materiale + furnizime + alerte" access="Menaxher" />
                <RouteRow route="/regjistrimi-ditor" desc="Regjistrim ditor T1/T2 + OCR mulliri" access="Shift token" />
                <RouteRow route="/analytics" desc="Xhiro 30-ditore, top produkte" access="Menaxher" />
                <RouteRow route="/porosi-furnitor" desc="Porositë për furnitorët" access="Menaxher" />
                <RouteRow route="/manager" desc="CRUD kategori/artikuj/staf/oferta" access="Menaxher" />
                <RouteRow route="/manager-login" desc="Hyrje me email + Google OAuth" access="Publik" />
                <RouteRow route="/print-station" desc="PC me printer — konsumon print_jobs" access="Passcode" />
                <RouteRow route="/dokumentacion" desc="Ky dokumentacion" access="Publik" />
                <RouteRow route="/install" desc="Udhëzime PWA për klientët" access="Publik" />
                <RouteRow route="/install-staff" desc="Udhëzime PWA për stafin" access="Publik" />
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══ 7. FLUKS I POROSISË ═══ */}
        <section className="mb-10">
          <SectionHeader icon="🔄" title="7. Fluksi i një porosie" subtitle="Nga QR-ja te bileta" color="#6a3a3a" colorEnd="#3a1a1a" />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <FlowStep label="Klient skanon QR" />
            <FlowArrow />
            <FlowStep label="/menu → Porosit" />
            <FlowArrow />
            <FlowStep label="orders (pending)" />
            <FlowArrow />
            <FlowStep label="Kamarier Prano" />
            <FlowArrow />
            <FlowStep label="pos_orders (open)" highlight />
            <FlowArrow />
            <FlowStep label="Banaku 'Gati'" />
            <FlowArrow />
            <FlowStep label="Print + Inventar -" />
            <FlowArrow />
            <FlowStep label="Shitje regjistruar" highlight />
          </div>
        </section>

        {/* ═══ 8. PRINT A4 ═══ */}
        <section className="mb-10 print:hidden">
          <SectionHeader icon="🖨" title="8. Print A4 & Preview" subtitle="Menuja për printim klasik" color="#3a3a6a" colorEnd="#1a1a3a" />
          <div className="space-y-2 text-sm text-[#3a2a1a] leading-relaxed">
            <p><strong>Ky dokumentacion:</strong> Kliko <em>"Printo A4"</em> lart djathtas → dialogu i shfletuesit → <em>Save as PDF</em> ose printer fizik. Formati është i optimizuar për A4 me margina 15mm.</p>
            <p><strong>Menuja për klientët:</strong> Hap <Code>/menu?tabela=1</Code> → <Code>Ctrl+P</Code> (ose ⌘+P në Mac) → aktivo <em>Background graphics</em> për të ruajtur ngjyrat luksoze.</p>
            <p><strong>Bileta e porosisë:</strong> Printohet automatikisht nga <Code>/print-station</Code> në format të vogël termik (42 karaktere për rresht).</p>
          </div>
        </section>

        {/* ═══ 9. PASSWORDS ═══ */}
        <section className="mb-10">
          <SectionHeader icon="🔐" title="9. Fjalëkalimet dhe aksesi" subtitle="Cfarë ku përdoret" color="#6a5a2a" colorEnd="#3a2a0a" />
          <div className="rounded-xl border-2 border-dashed border-[#c8b0e0] p-4 bg-[#f8f4fc]">
            <p className="text-xs text-[#6a5a8a] leading-relaxed">
              <strong>⚠️ Konfidenciale:</strong> Passcode-t (admin, banaku, print station) dhe PIN-et e stafit <strong>NUK</strong> shfaqen në këtë faqe publike. 
              Ato dërgohen vetëm me email privat kur menaxheri klikon <strong>"Dërgo Private 🔐"</strong> lart djathtas.
            </p>
            <p className="text-xs text-[#6a5a8a] mt-2 leading-relaxed">
              Të gjitha verifikimet e passcode-ve bëhen <em>server-side</em> në edge functions (<Code>verify-admin-passcode</Code>, <Code>verify-staff-pin</Code>, <Code>manage-admin-passcode</Code>) me rate-limiting.
            </p>
          </div>
        </section>

        {/* ═══ 10. DATABASE ═══ */}
        <section className="mb-10">
          <SectionHeader icon="🗄" title="10. Databaza — si përdoret" subtitle="Tabelat kryesore" color="#2a5a5a" colorEnd="#0a3a3a" />
          <div className="grid grid-cols-2 gap-3">
            <DocCard icon="🍽" title="menu_items" items={["Emri SQ/EN, çmim, foto", "promo_price + promo_start/end", "available, display_order", "category_id"]} />
            <DocCard icon="📂" title="categories" items={["Kategoritë e menusë", "display_order manual", "Emër SQ/EN"]} />
            <DocCard icon="🧾" title="orders / pos_orders" items={["Porositë klientë vs POS", "Statuse: pending/open/closed", "Table_number, items JSONB"]} />
            <DocCard icon="💰" title="transactions" items={["Shitjet e regjistruara", "Trigger krijon fiscal_receipts", "Ndarë net + VAT 20%"]} />
            <DocCard icon="📦" title="raw_materials + recipes" items={["Sasi + min_threshold", "Zbritja automatike", "Lidhje item → material"]} />
            <DocCard icon="👥" title="staff_members + user_roles" items={["PIN-e kamarierësh", "Roli: waiter/bar/admin", "Enum app_role"]} />
            <DocCard icon="🔑" title="shift_tokens + shift_turns" items={["Sesionet e turnit", "Regjistrimi T1/T2", "Mbyllje me admin"]} />
            <DocCard icon="📜" title="audit_log" items={["Cdo INSERT/UPDATE/DELETE", "Actor + old_data + new_data", "Trigger në 8 tabela"]} />
          </div>
          <p className="text-xs text-[#8a7a5a] mt-3">
            Të gjitha tabelat kanë <strong>RLS aktive</strong>. Fshirjet lejohen vetëm për <Code>admin</Code>. Të dhënat sensitive lexohen përmes edge functions me <Code>x-shift-token</Code> ose Supabase Auth.
          </p>
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
