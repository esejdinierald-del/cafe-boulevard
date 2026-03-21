import { Button } from "@/components/ui/button";
import { Printer, Mail } from "lucide-react";

const AppDocumentation = () => {
  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent("Boulevard Caffe - Konfigurime & Kredenciale");
    const body = encodeURIComponent(`
═══════════════════════════════════════
  BOULEVARD CAFFE - KONFIGURIME PRIVATE
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
Boulevard Caffe © 2026
    `.trim());

    window.location.href = `mailto:e.sejdini.erald@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Top Buttons - Hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={handleSendEmail} variant="outline" className="gap-2 bg-white border-purple-500 text-purple-700 hover:bg-purple-50">
          <Mail className="h-4 w-4" />
          Dërgo në Email 🔐
        </Button>
        <Button onClick={handlePrint} className="gap-2 bg-white border-black text-black hover:bg-gray-100" variant="outline">
          <Printer className="h-4 w-4" />
          Printo A4
        </Button>
      </div>

      {/* A4 Document */}
      <div className="max-w-[210mm] mx-auto p-8 print:p-[15mm] print:max-w-none">
        
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-2">Boulevard Caffe</h1>
          <h2 className="text-xl text-gray-600">Dokumentacion i Sistemit</h2>
          <p className="text-sm text-gray-500 mt-2">Versioni 1.1 - Mars 2026</p>
        </div>

        {/* Customer Role */}
        <section className="mb-8">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-amber-800">👤 KLIENTI (Rol Publik)</h3>
            <p className="text-sm text-amber-600">Akses: Skanimi i QR kodit në tavolinë → /?table=X</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">📋 Shikimi i Menusë</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Shfletim i kategorive të menusë</li>
                <li>Shikimi i produkteve me foto dhe çmime</li>
                <li>Filtrim sipas kategorisë</li>
                <li>Mbështetje dygjuhëshe (Shqip/English)</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🛒 Porositja</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Shtim i produkteve në shportë</li>
                <li>Modifikim i sasive</li>
                <li>Shtim i shënimeve për porosi</li>
                <li>Dërgim i porosisë në kuzhinë</li>
                <li>Njoftim automatik i stafit</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🔔 Kërkesa Shërbimi</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Thirrje e kamarierit</li>
                <li>Kërkesë për faturë</li>
                <li>Njoftim në kohë reale në dashboard</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">💬 Chat me AI</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Asistent virtual "Pyet Stafin"</li>
                <li>Informacion rreth produkteve dhe ofertave</li>
                <li>Rekomandime personale</li>
                <li>Informacion rreth eventeve</li>
              </ul>
            </div>

            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🏷️ Oferta me Orar</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Çmime të zbritura automatike sipas orarit</li>
                <li>Shfaqje me vizuale (çmim i vjetër i hequr)</li>
                <li>Oferta aktivizohen/çaktivizohen vetë</li>
                <li>Timezone: Europe/Rome</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Staff Role */}
        <section className="mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-blue-800">👔 STAFI / KAMARIERI</h3>
            <p className="text-sm text-blue-600">Akses: /dashboard - Zhbllokohet me skanim QR</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">📊 Dashboard Kryesor</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Pamje e të gjitha porosive aktive</li>
                <li>Shikimi i kërkesave për shërbim</li>
                <li>Badge me numrin e pending</li>
                <li>Timer që tregon kohën e pritjes</li>
                <li>Rifreskim automatik në kohë reale</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🔔 Sistem Njoftimesh</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Njoftimet me zë (Text-to-Speech)</li>
                <li>Njoftimet me tingull (bell sound)</li>
                <li>Përsëritje automatike çdo 30 sekonda</li>
                <li>Buton "Porosia Gati 🔔" për kuzhinën</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">📝 Menaxhimi i Porosive</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Shënim si "Completed"</li>
                <li>Anulim i porosive</li>
                <li>Shikimi i detajeve (artikuj, shënime)</li>
                <li>Identifikim sipas numrit të tavolinës</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Manager Section - HIDDEN, only sent via email */}
        <section className="mb-8 print:hidden">
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
            <h3 className="text-xl font-bold text-purple-800">👑 MENAXHERI</h3>
            <p className="text-sm text-purple-600 mt-1">
              Kredencialet dhe konfigurimet janë private. Kliko butonin "Dërgo në Email 🔐" lart djathtas për t'i marrë me email.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t pt-4 mt-8">
          <p>Boulevard Caffe - Sistem i Menaxhimit të Restorantit</p>
          <p>Zhvilluar me Lovable.dev | © 2026</p>
        </div>

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

export default AppDocumentation;
