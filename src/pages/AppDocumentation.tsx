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
