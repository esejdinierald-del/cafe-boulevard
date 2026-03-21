import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const AppDocumentation = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Print Button - Hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Printo A4
        </Button>
      </div>

      {/* A4 Document */}
      <div className="max-w-[210mm] mx-auto p-8 print:p-[15mm] print:max-w-none">
        
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-2">Boulevard Caffe</h1>
          <h2 className="text-xl text-gray-600">Dokumentacion i Sistemit të Menaxhimit</h2>
          <p className="text-sm text-gray-500 mt-2">Versioni 1.0 - Janar 2026</p>
        </div>

        {/* Customer Role */}
        <section className="mb-8">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-amber-800">👤 KLIENTI (Rol Publik)</h3>
            <p className="text-sm text-amber-600">Akses: Pa autentikim - Skanimi i QR kodit në tavolinë</p>
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
                <li>Informacion rreth produkteve</li>
                <li>Rekomandime personale</li>
                <li>Informacion rreth eventeve (ndeshje futbolli)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Staff Role */}
        <section className="mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-blue-800">👔 STAFI / KAMARIERI</h3>
            <p className="text-sm text-blue-600">Akses: /dashboard - Fjalëkalimi: 2025</p>
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
                <li>Aktivizim/çaktivizim i njoftimeve</li>
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

        {/* Manager Role */}
        <section className="mb-8">
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-purple-800">👑 MENAXHERI</h3>
            <p className="text-sm text-purple-600">Akses: /manager-login - Autentikim me email/fjalëkalim</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">📂 Menaxhimi i Kategorive</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Shtim i kategorive të reja</li>
                <li>Editim i emrave të kategorive</li>
                <li>Fshirje e kategorive</li>
                <li>Renditje sipas prioritetit</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🍕 Menaxhimi i Artikujve</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Shtim i produkteve të reja</li>
                <li>Ngarkim i fotove të produkteve</li>
                <li>Caktim i çmimeve</li>
                <li>Përshkrim i produkteve</li>
                <li>Lidhje me kategori</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">✏️ Editimi i Artikujve</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Ndryshim i emrit dhe çmimit</li>
                <li>Përditësim i fotove</li>
                <li>Aktivizim/Çaktivizim</li>
                <li>Fshirje e produkteve</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🔐 Siguria</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Autentikim i sigurt me Supabase Auth</li>
                <li>Rol i veçantë "manager" në databazë</li>
                <li>RLS policies për mbrojtje të të dhënave</li>
                <li>Sesion i sigurt</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technical Info */}
        <section className="mb-8 page-break-before">
          <div className="bg-gray-100 border-l-4 border-gray-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-gray-800">⚙️ INFORMACION TEKNIK</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🛠️ Teknologjitë</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>React + TypeScript + Vite</li>
                <li>Tailwind CSS për stilizim</li>
                <li>Supabase (Lovable Cloud) për backend</li>
                <li>Edge Functions për API</li>
                <li>Realtime për sinkronizim</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🔗 URL-të e Sistemit</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li><strong>/</strong> - Faqja kryesore</li>
                <li><strong>/menu</strong> - Menu e plotë</li>
                <li><strong>/dashboard</strong> - Dashboard stafi</li>
                <li><strong>/manager-login</strong> - Login menaxher</li>
                <li><strong>/manager</strong> - Panel menaxheri</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">📱 QR Kodet</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Vendosur në secilën tavolinë</li>
                <li>Lidhen me ?table=X parametër</li>
                <li>Identifikojnë automatikisht tavolinën</li>
                <li>Gjenerohen në /public/qr-codes/</li>
              </ul>
            </div>
            
            <div className="border rounded p-3">
              <h4 className="font-bold mb-2">🤖 AI Integration</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Lovable AI Gateway</li>
                <li>Model: google/gemini-2.5-flash</li>
                <li>Text-to-Speech për njoftimet</li>
                <li>Chat asistent për klientët</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Database Tables */}
        <section className="mb-8">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-green-800">🗄️ STRUKTURA E DATABAZËS</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="border rounded p-2">
              <h4 className="font-bold mb-1">categories</h4>
              <p className="text-gray-600">id, name, name_en, display_order, created_at</p>
            </div>
            <div className="border rounded p-2">
              <h4 className="font-bold mb-1">menu_items</h4>
              <p className="text-gray-600">id, name, name_en, description, price, category_id, image_url, available</p>
            </div>
            <div className="border rounded p-2">
              <h4 className="font-bold mb-1">orders</h4>
              <p className="text-gray-600">id, table_number, items, total_price, status, notes, created_at</p>
            </div>
            <div className="border rounded p-2">
              <h4 className="font-bold mb-1">service_requests</h4>
              <p className="text-gray-600">id, table_number, request_type, status, created_at</p>
            </div>
            <div className="border rounded p-2">
              <h4 className="font-bold mb-1">user_roles</h4>
              <p className="text-gray-600">id, user_id, role (admin/manager/user)</p>
            </div>
            <div className="border rounded p-2">
              <h4 className="font-bold mb-1">table_devices</h4>
              <p className="text-gray-600">id, table_number, device_id, device_name, device_type</p>
            </div>
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
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
};

export default AppDocumentation;
