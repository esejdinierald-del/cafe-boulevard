import { Button } from "@/components/ui/button";
import { Printer, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AppDocumentation = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent("Boulevard Café - Konfigurime & Kredenciale");
    const body = encodeURIComponent(`
═══════════════════════════════════════
  BOULEVARD CAFÉ - KONFIGURIME PRIVATE
═══════════════════════════════════════

👑 MENAXHERI - AKSES
━━━━━━━━━━━━━━━━━━━
• URL Login: /manager-login
• Panel: /manager
• Email autorizuar: e.sejdini.erald@gmail.com, sejdinieral@gmail.com
• Autentikim: Supabase Auth (email + fjalëkalim)
• Regjistrimet e reja: TË ÇAKTIVIZUARA (vetëm email-et e autorizuara)
• Rivendosja e fjalëkalimit: vetëm për email-et e autorizuara

📂 FUNKSIONALITETE MENAXHERI
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Menaxhimi i kategorive (shto/edito/fshi)
• Menaxhimi i artikujve me foto, çmime, përshkrime
• Sistemi i ofertave me orar (offer_price, offer_start_time, offer_end_time)
• Tab AI - Baza e njohurive për asistentin virtual
• Shikimi i porosive dhe kërkesave
• Feedback/Vlerësimet e klientëve

👔 STAFI / DASHBOARD
━━━━━━━━━━━━━━━━━━━
• URL: /dashboard
• Fjalëkalimi i hyrjes: 2025
• Zhbllokohet vetëm me skanim QR

🔗 LINQE KLIENTËSH (QR)
━━━━━━━━━━━━━━━━━━━━━━━
• Tavolina 1: /?table=1
• Tavolina 2: /?table=2
• Tavolina 3: /?table=3
• Tavolina 4: /?table=4
• Format: [DOMAIN]/?table=X

⚙️ KONFIGURIMI TEKNIK
━━━━━━━━━━━━━━━━━━━━━
• Frontend: React + TypeScript + Vite
• Backend: Lovable Cloud (Supabase)
• Supabase Project ID: taqrxxikhwghmeofrpzs
• Realtime: Aktivizuar për orders, service_requests
• Storage Bucket: menu-images (publik)
• AI Model: google/gemini-2.5-flash

🗄️ DATABAZA
━━━━━━━━━━━
• categories: id, name, name_en, display_order
• menu_items: id, name, price, offer_price, offer_start_time, offer_end_time, category_id, image_url, available
• orders: id, table_number, items, total_price, status, notes
• service_requests: id, table_number, request_type, status
• feedback: id, table_number, rating, comment
• user_roles: id, user_id, role (admin/manager/user)
• ai_knowledge: id, title, content
• chat_sessions: id, session_id, messages
• shift_tokens: id, token, shift_start, shift_end, unlocked

🔐 SIGURIA
━━━━━━━━━━
• RLS aktive në të gjitha tabelat
• Fshirja: vetëm admin/manager
• Trigger: handle_manager_signup (auto-assign roles)
• Funksioni: has_role() - SECURITY DEFINER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Gjeneruar automatikisht nga sistemi
Boulevard Café © 2026
    `.trim());

    window.location.href = `mailto:e.sejdini.erald@gmail.com?subject=${subject}&body=${body}`;
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
          <Button onClick={handleSendEmail} size="sm" className="gap-2 bg-[#2d1b15] text-[#e8dcc0] hover:bg-[#3d2418] border-none text-xs">
            <Mail className="h-3.5 w-3.5" />
            Dërgo Private 🔐
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
        </section>

        {/* ═══ KLIENTI ═══ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e8e0d4]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
              background: 'linear-gradient(135deg, #f5e6c8, #e8d5a8)',
              boxShadow: '0 2px 8px rgba(201,163,92,0.2)',
            }}>👤</div>
            <div>
              <h3 className="text-xl font-bold text-[#2d1b15]" style={{ fontFamily: "'Playfair Display', serif" }}>
                KLIENTI
              </h3>
              <p className="text-xs text-[#8a7a5a]">Rol publik · Akses përmes QR kodit në tavolinë</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DocCard icon="📋" title="Shikimi i Menusë" items={[
              "Shfletim i kategorive të menusë",
              "Shikimi i produkteve me foto dhe çmime",
              "Filtrim sipas kategorisë",
              "Mbështetje dygjuhëshe (Shqip / English)",
              "Shikimi i ofertave aktive me çmim të zbritur",
            ]} />
            <DocCard icon="🛒" title="Porositja" items={[
              "Shtim i produkteve në shportë",
              "Modifikim i sasive",
              "Shtim i shënimeve për porosi",
              "Dërgim i porosisë në kuzhinë",
              "Njoftim automatik i stafit në kohë reale",
            ]} />
            <DocCard icon="🔔" title="Kërkesa Shërbimi" items={[
              "Thirrje e kamarierit (buton 'Thirr Kamerieren')",
              "Kërkesë për faturë (buton 'Kërko Faturën')",
              "Njoftim në kohë reale në dashboard",
              "Identifikim automatik i numrit të tavolinës",
            ]} />
            <DocCard icon="💬" title="Chat me AI" items={[
              "Asistent virtual 'Pyet Stafin'",
              "Informacion rreth produkteve dhe ofertave",
              "Rekomandime personale",
              "Mbështetur nga Google Gemini 2.5 Flash",
            ]} />
            <DocCard icon="⭐" title="Vlerësimi (Feedback)" items={[
              "Vlerësim me yje (1-5)",
              "Koment opsional",
              "Ruajtje automatike me numrin e tavolinës",
              "Shikimi nga menaxheri në panel",
            ]} />
            <DocCard icon="🏷️" title="Oferta me Orar" items={[
              "Çmime të zbritura automatike sipas orarit",
              "Shfaqje vizuale (çmim i vjetër i hequr)",
              "Aktivizim/çaktivizim automatik",
              "Timezone: Europe/Rome",
            ]} />
          </div>
        </section>

        {/* ═══ STAFI ═══ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e8e0d4]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
              background: 'linear-gradient(135deg, #d0e0f0, #b0c8e0)',
              boxShadow: '0 2px 8px rgba(100,140,200,0.2)',
            }}>👔</div>
            <div>
              <h3 className="text-xl font-bold text-[#2d1b15]" style={{ fontFamily: "'Playfair Display', serif" }}>
                STAFI / KAMARIERI
              </h3>
              <p className="text-xs text-[#8a7a5a]">Akses: /dashboard · Zhbllokohet me skanim QR</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <DocCard icon="📊" title="Dashboard Kryesor" items={[
              "Pamje e të gjitha porosive aktive",
              "Shikimi i kërkesave për shërbim",
              "Badge me numrin e pending",
              "Timer që tregon kohën e pritjes",
              "Rifreskim automatik në kohë reale (Realtime)",
            ]} />
            <DocCard icon="🔔" title="Sistem Njoftimesh" items={[
              "Njoftimet me zë (Text-to-Speech)",
              "Njoftimet me tingull (bell sound)",
              "Përsëritje automatike çdo 30 sekonda",
              "Buton 'Porosia Gati' për kuzhinën",
            ]} />
            <DocCard icon="📝" title="Menaxhimi i Porosive" items={[
              "Shënim si 'Completed'",
              "Anulim i porosive",
              "Shikimi i detajeve (artikuj, shënime)",
              "Identifikim sipas numrit të tavolinës",
            ]} />
            <DocCard icon="📱" title="PWA për Stafin" items={[
              "Instalohet si aplikacion në telefon",
              "Manifest i dedikuar: /staff-manifest.webmanifest",
              "Hyrje me token turni (shift_tokens)",
              "Ridrejtohet automatikisht pas instalimit",
            ]} />
          </div>
        </section>

        {/* ═══ MENAXHERI — VETËM MESAZH ═══ */}
        <section className="mb-10 print:hidden">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e8e0d4]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
              background: 'linear-gradient(135deg, #e0d0f0, #c8b0e0)',
              boxShadow: '0 2px 8px rgba(140,100,200,0.2)',
            }}>👑</div>
            <div>
              <h3 className="text-xl font-bold text-[#2d1b15]" style={{ fontFamily: "'Playfair Display', serif" }}>
                MENAXHERI
              </h3>
              <p className="text-xs text-[#8a7a5a]">Akses i kufizuar · Kredenciale private</p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-[#c8b0e0] p-6 text-center bg-[#f8f4fc]">
            <div className="text-3xl mb-3">🔐</div>
            <p className="text-sm text-[#6a5a8a] mb-1 font-medium">
              Kredencialet dhe konfigurimet teknike janë private.
            </p>
            <p className="text-xs text-[#8a7aaa]">
              Kliko butonin <strong>"Dërgo Private 🔐"</strong> lart djathtas për t'i marrë direkt në email-in e autorizuar.
            </p>
          </div>
        </section>

        {/* ═══ ARKITEKTURA ═══ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e8e0d4]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
              background: 'linear-gradient(135deg, #d4e8d0, #b0d8a8)',
              boxShadow: '0 2px 8px rgba(100,180,100,0.2)',
            }}>🏗️</div>
            <div>
              <h3 className="text-xl font-bold text-[#2d1b15]" style={{ fontFamily: "'Playfair Display', serif" }}>
                ARKITEKTURA E SISTEMIT
              </h3>
              <p className="text-xs text-[#8a7a5a]">Stack teknik dhe fluksi i të dhënave</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-6">
            <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white">
              <h4 className="font-bold text-[#2d1b15] mb-2 text-xs uppercase tracking-wider">Frontend</h4>
              <ul className="space-y-1.5 text-[#5a4a3a]">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a35c]" />React 18 + TypeScript</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a35c]" />Vite 5 (Build Tool)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a35c]" />Tailwind CSS v3</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a35c]" />React Router v6</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a35c]" />TanStack Query v5</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white">
              <h4 className="font-bold text-[#2d1b15] mb-2 text-xs uppercase tracking-wider">Backend</h4>
              <ul className="space-y-1.5 text-[#5a4a3a]">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#6a9fd8]" />Lovable Cloud (Supabase)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#6a9fd8]" />PostgreSQL Database</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#6a9fd8]" />Edge Functions (Deno)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#6a9fd8]" />Realtime Subscriptions</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#6a9fd8]" />Storage (menu-images)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white">
              <h4 className="font-bold text-[#2d1b15] mb-2 text-xs uppercase tracking-wider">AI & Siguria</h4>
              <ul className="space-y-1.5 text-[#5a4a3a]">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c06080]" />Google Gemini 2.5 Flash</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c06080]" />RLS në të gjitha tabelat</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c06080]" />has_role() Security Definer</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c06080]" />Trigger auto-assign roles</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#c06080]" />PWA + Service Worker</li>
              </ul>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="rounded-xl border border-[#e8e0d4] p-5 bg-white">
            <h4 className="font-bold text-[#2d1b15] mb-4 text-xs uppercase tracking-wider text-center">Fluksi i Porosisë</h4>
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
              <FlowStep label="Skanim QR" />
              <FlowArrow />
              <FlowStep label="Shiko Menunë" />
              <FlowArrow />
              <FlowStep label="Zgjidh Artikuj" />
              <FlowArrow />
              <FlowStep label="Dërgo Porosinë" />
              <FlowArrow />
              <FlowStep label="Dashboard (Stafi)" highlight />
              <FlowArrow />
              <FlowStep label="Gati ✓" />
            </div>
          </div>
        </section>

        {/* ═══ FAQET DHE ROUTES ═══ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e8e0d4]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{
              background: 'linear-gradient(135deg, #f0e0c0, #e0d0a0)',
            }}>🗺️</div>
            <div>
              <h3 className="text-xl font-bold text-[#2d1b15]" style={{ fontFamily: "'Playfair Display', serif" }}>
                FAQET E APLIKACIONIT
              </h3>
              <p className="text-xs text-[#8a7a5a]">Routes dhe aksesi</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#e8e0d4] overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f5f0e8]">
                  <th className="text-left px-4 py-2.5 font-semibold text-[#2d1b15] text-xs uppercase tracking-wider">Route</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#2d1b15] text-xs uppercase tracking-wider">Përshkrim</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#2d1b15] text-xs uppercase tracking-wider">Akses</th>
                </tr>
              </thead>
              <tbody>
                <RouteRow route="/" desc="Faqja kryesore e klientit" access="Publik" />
                <RouteRow route="/?table=X" desc="Me numër tavoline nga QR" access="Publik" />
                <RouteRow route="/menu" desc="Menu e plotë me kategori" access="Publik" />
                <RouteRow route="/dashboard" desc="Dashboard i stafit" access="QR + Kod" />
                <RouteRow route="/staff" desc="PWA e stafit" access="Token turni" />
                <RouteRow route="/manager-login" desc="Hyrje menaxheri" access="Email autorizuar" />
                <RouteRow route="/manager" desc="Panel menaxheri" access="Autentikuar" />
                <RouteRow route="/dokumentacion" desc="Ky dokument" access="Publik" />
                <RouteRow route="/install" desc="Udhëzime instalimi PWA" access="Publik" />
              </tbody>
            </table>
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

const DocCard = ({ icon, title, items }: { icon: string; title: string; items: string[] }) => (
  <div className="rounded-xl border border-[#e8e0d4] p-4 bg-white hover:shadow-md transition-shadow">
    <h4 className="font-bold text-[#2d1b15] mb-2.5 flex items-center gap-2">
      <span>{icon}</span> {title}
    </h4>
    <ul className="space-y-1.5 text-[#5a4a3a]">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a35c] mt-1.5 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
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
