import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="bg-card/60 border-gold-brand/20 backdrop-blur">
    <CardHeader>
      <CardTitle className="font-display text-2xl text-gold-brand">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 text-foreground/90 leading-relaxed">{children}</CardContent>
  </Card>
);

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-display text-xl text-gold-light mt-4 mb-2">{children}</h3>
);

const Sub = ({ children }: { children: React.ReactNode }) => (
  <h4 className="font-semibold text-foreground mt-3 mb-1">{children}</h4>
);

const Steps = ({ items }: { items: string[] }) => (
  <ol className="list-decimal list-inside space-y-1 pl-2 marker:text-gold-brand">
    {items.map((i, idx) => (
      <li key={idx}>{i}</li>
    ))}
  </ol>
);

const Bullets = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc list-inside space-y-1 pl-2 marker:text-gold-brand">
    {items.map((i, idx) => (
      <li key={idx}>{i}</li>
    ))}
  </ul>
);

export default function Documentation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="border-gold-brand/40 hover:bg-gold-brand/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kthehu
          </Button>
        </div>

        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-gold-brand">
            Boulevard Café — Dokumentacioni
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Udhëzues i plotë për klientët, stafin dhe menaxherët
          </p>
        </header>

        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto gap-1 bg-card/40 p-1">
            <TabsTrigger value="clients" className="text-xs sm:text-sm">Për Klientët</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs sm:text-sm">Për Stafin</TabsTrigger>
            <TabsTrigger value="managers" className="text-xs sm:text-sm">Për Menaxherët</TabsTrigger>
            <TabsTrigger value="db" className="text-xs sm:text-sm">Baza e Të Dhënave</TabsTrigger>
            <TabsTrigger value="troubleshoot" className="text-xs sm:text-sm">Problemet</TabsTrigger>
          </TabsList>

          {/* KLIENTËT */}
          <TabsContent value="clients" className="mt-6 space-y-4">
            <Section title="Hyrja në Aplikacion">
              <p>
                Klientët skanojnë kodin QR në tavolinë për të hapur aplikacionin.
                Automatikisht identifikohet numri i tavolinës.
              </p>
            </Section>

            <Section title="Thirrja e Kamarierit">
              <Steps
                items={[
                  'Klikoni butonin "Thirr Kamarier" në ekranin kryesor.',
                  "Kamarieri merr njoftim në panelin e tij në kohë reale.",
                  "Merrni konfirmim që kërkesa është dërguar.",
                ]}
              />
            </Section>

            <Section title="Kërkimi i Faturës">
              <Steps
                items={[
                  'Klikoni butonin "Kërko Faturën".',
                  "Kamarieri sjell faturën në tavolinën tuaj.",
                  "Prisni konfirmimin nga stafi.",
                ]}
              />
            </Section>

            <Section title="Porositja nga Menyja">
              <Steps
                items={[
                  'Klikoni "Porosit nga Menyja".',
                  "Shfletoni kategoritë e produkteve.",
                  "Zgjidhni produktet dhe sasitë.",
                  "Konfirmoni porosinë — do të vijë në KDS të banakut/kuzhinës.",
                ]}
              />
            </Section>

            <Section title="Ndërrimi i Gjuhës">
              <p>
                Klikoni butonin e flamurit në këndin e sipërm djathtas për të ndërruar
                midis <strong>Shqipes</strong> dhe <strong>Anglishtes</strong>.
              </p>
            </Section>
          </TabsContent>

          {/* STAFI */}
          <TabsContent value="staff" className="mt-6 space-y-4">
            <Section title="Hyrja në Dashboard">
              <p>
                Stafi hyn te <code className="text-gold-light">/staff</code> me QR ose PIN.
                Pas validimit të turnit, ridrejtohet te POS ose Dashboard.
              </p>
            </Section>

            <Section title="Paneli i Kërkesave">
              <Sub>Funksionalitete</Sub>
              <Bullets
                items={[
                  "Shikimi i kërkesave aktive në kohë reale.",
                  "Numri i tavolinës që ka bërë kërkesën.",
                  "Lloji i kërkesës: Kamarier ose Faturë.",
                  "Ngjyrat: kërkesat e reja pulsojnë për t'u dukur qartë.",
                  "Njoftim me tingull për çdo kërkesë të re.",
                ]}
              />
              <Sub>Veprime</Sub>
              <Bullets
                items={[
                  'Shëno si "Të Kryer" kur përmbushet kërkesa.',
                  "Përditësim automatik i listës nëpërmjet Realtime.",
                ]}
              />
            </Section>

            <Section title="Menaxhimi i Porosive">
              <Steps
                items={[
                  "Prisni njoftimin për porosi/kërkesë të re.",
                  "Lexoni detajet (tavolina, lloji, artikujt).",
                  "Kryeni shërbimin ose konfirmoni në KDS.",
                  'Klikoni "Gati" ose "Mark as Completed" kur mbaroni.',
                  "Kërkesa hiqet nga lista aktive.",
                ]}
              />
            </Section>

            <Section title="Mbyllja e Turnit">
              <p>
                Kamarieri nuk mund të mbyllë turnin para orës <strong>23:59</strong> pa
                fjalëkalimin e adminit. Çdo veprim regjistrohet me kohë dhe datë të
                pandryshueshme (Europe/Rome).
              </p>
            </Section>
          </TabsContent>

          {/* MENAXHERËT */}
          <TabsContent value="managers" className="mt-6 space-y-4">
            <Section title="Hyrja në Sistem">
              <Steps
                items={[
                  "Shkoni te /manager-login.",
                  "Vendosni kredencialet e menaxherit.",
                  'Klikoni "Login" për të hyrë në panel.',
                ]}
              />
            </Section>

            <Section title="Menaxhimi i Produkteve">
              <Sub>Shto Produkt të Ri</Sub>
              <Bullets
                items={[
                  "Emri i produktit",
                  "Përshkrimi",
                  "Çmimi në Lekë",
                  "Kategoria",
                  "Imazhi (opsional, WebP/JPG < 500KB)",
                ]}
              />
              <Sub>Modifiko / Fshi</Sub>
              <Bullets
                items={[
                  "Përditëso çdo fushë dhe ruaj ndryshimet.",
                  "Fshi produkte që nuk ofrohen më.",
                ]}
              />
            </Section>

            <Section title="Menaxhimi i Kategorive">
              <Bullets
                items={[
                  "Shto kategori të re me emër dhe pozicion.",
                  "Riemërto ose ndrysho renditjen.",
                  'Aktivizo/çaktivizo kategori me flag "Aktive".',
                  'Vendos "Përfshi në regjistrimin ditor" për kontabilitet.',
                  "Fshi kategori bosh.",
                ]}
              />
            </Section>

            <Section title="Statistikat">
              <Bullets
                items={[
                  "Numri total i produkteve dhe kategorive.",
                  "Kërkesat e fundit të klientëve.",
                  "Xhiro 30-ditore dhe top produkte (Analytics).",
                  "Të dhëna në kohë reale.",
                ]}
              />
            </Section>

            <Section title="Best Practices">
              <Bullets
                items={[
                  "Përditësoni menynë rregullisht.",
                  "Mbani çmimet të sakta.",
                  "Shtoni përshkrime të qarta për produkte.",
                  "Përdorni imazhe cilësore (katrore, < 500KB).",
                  "Organizoni kategoritë logjikisht.",
                  "Testoni aplikacionin para ndryshimeve të mëdha.",
                ]}
              />
            </Section>
          </TabsContent>

          {/* DATABASE */}
          <TabsContent value="db" className="mt-6 space-y-4">
            <Section title="Tabelat Kryesore">
              <H>service_requests</H>
              <p>Ruaj kërkesat e klientëve për shërbim.</p>
              <Bullets
                items={[
                  "id (uuid)",
                  "table_number (text)",
                  "request_type (waiter | bill)",
                  "status (pending | completed)",
                  "created_at (timestamp)",
                ]}
              />

              <H>menu_categories</H>
              <Bullets
                items={[
                  "id (uuid)",
                  "name (text)",
                  "position (integer)",
                  "enabled / track_daily (boolean)",
                ]}
              />

              <H>menu_items</H>
              <Bullets
                items={[
                  "id (uuid)",
                  "category_id (uuid)",
                  "name, description, price, image_url",
                ]}
              />

              <H>pos_orders & transactions</H>
              <Bullets
                items={[
                  "pos_orders: porositë (open/confirmed/closed) me operator_name.",
                  "transactions: shitjet (sale/void/refund) me items dhe amount.",
                  "UNIQUE (order_id, type='sale') për të parandaluar dublikatat.",
                ]}
              />

              <H>raw_materials & recipes</H>
              <Bullets
                items={[
                  "raw_materials: quantity, unit, min_threshold, is_critical.",
                  "recipes: menu_item_id → material_id (quantity_per_unit).",
                ]}
              />
            </Section>

            <Section title="Siguria & RLS">
              <Bullets
                items={[
                  "RLS e aktivizuar në çdo tabelë publike.",
                  "DELETE i lejuar vetëm për admin.",
                  "audit_log trigger për 8 tabela kritike.",
                  "PIN i stafit i ruajtur me bcrypt hash.",
                  "x-shift-token për validim në Edge Functions.",
                ]}
              />
            </Section>
          </TabsContent>

          {/* TROUBLESHOOTING */}
          <TabsContent value="troubleshoot" className="mt-6 space-y-4">
            <Section title="Kërkesa nuk dërgohet">
              <Bullets
                items={[
                  "Kontrolloni lidhjen e internetit.",
                  "Rifreskoni faqen.",
                  "Provoni përsëri pas disa sekondash.",
                ]}
              />
            </Section>

            <Section title="Dashboard nuk përditësohet">
              <Bullets
                items={[
                  "Sigurohuni që jeni të kyçur me turn aktiv.",
                  "Rifreskoni faqen.",
                  "Kontrolloni shfletuesin (lejoni njoftime/tingull).",
                ]}
              />
            </Section>

            <Section title="Nuk mund të hyj si menaxher">
              <Bullets
                items={[
                  "Verifikoni kredencialet e menaxherit.",
                  "Kontaktoni administratorin për reset.",
                  "Kontrolloni që lidhja me backend është aktive.",
                ]}
              />
            </Section>

            <Section title="Produktet nuk shfaqen">
              <Bullets
                items={[
                  "Sigurohuni që produktet janë shtuar dhe janë aktive.",
                  'Kontrolloni që kategoria është e aktivizuar ("Aktive"=true).',
                  "Rifreskoni faqen.",
                ]}
              />
            </Section>

            <Section title="Printeri nuk printon">
              <Bullets
                items={[
                  "Sigurohuni që /print-station është hapur në PC-në e printerit.",
                  "Kontrolloni radhën te print_jobs.",
                  "Rifreskoni Print Station për të tërhequr punët e reja.",
                ]}
              />
            </Section>

            <Section title="Telegram — mesazhet nuk vijnë">
              <Bullets
                items={[
                  "Verifiko që bot-i është shtuar në grup dhe dërgo së paku 1 mesazh para se të klikosh Gjej Grupin.",
                  "Kontrollo që chat_id është ruajtur te app_settings (telegram_chat_id).",
                  "Ri-regjistro webhook-un nga /admin-tools nëse getWebhookInfo tregon URL të gabuar.",
                  "TELEGRAM_BOT_TOKEN duhet të jetë i vlefshëm te secrets.",
                ]}
              />
            </Section>

            <Section title="Web Push nuk vjen kur browser-i është mbyllur">
              <Bullets
                items={[
                  "Push shkon VETËM te pajisjet me turn aktual aktiv (shift_tokens.unlocked=true dhe now() brenda intervalit).",
                  "Verifiko që abonimi është regjistruar te push_subscriptions me shift_token të vlefshëm.",
                  "iOS: PWA duhet të jetë instaluar në Home Screen për Web Push.",
                ]}
              />
            </Section>

            <Section title="Inventari duket i pasaktë">
              <Bullets
                items={[
                  "Gjendja te Regjistrimi Ditor është vetëm për audit — NUK e ndryshon raw_materials.",
                  "Ndrysho sasinë vetëm përmes Furnizimeve ose Rregullimit Admin (me passcode).",
                  "Kontrollo recetat: quantity_needed = numri i copëve/dozave per shërbim.",
                ]}
              />
            </Section>

            <Section title="Kontakti">
              <Bullets
                items={[
                  "Facebook: facebook.com/boulevard-cafe",
                  "Instagram: instagram.com/boulevard-cafe",
                ]}
              />
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}