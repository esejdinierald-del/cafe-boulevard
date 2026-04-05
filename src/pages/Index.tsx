import { useState, useEffect } from "react";
import { Bell, Receipt, UtensilsCrossed, MessageCircle, Star, MapPin, Check, Languages } from "lucide-react";
import { StaffChatDialog } from "@/components/StaffChatDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { WelcomeGreeting } from "@/components/WelcomeGreeting";
import { toast } from "sonner";
import logo from "@/assets/boulevard-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useGeolocation } from "@/hooks/use-geolocation";

const STAFF_PWA_PREFERRED_KEY = "staff_pwa_preferred";

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const shouldRedirectToStaff = () =>
  isStandaloneMode() && (
    Boolean(localStorage.getItem("staff_shift_token")) ||
    localStorage.getItem(STAFF_PWA_PREFERRED_KEY) === "1"
  );

const translations = {
  sq: {
    table: "Tavolinë",
    chooseService: "Mirë se erdhët! Si mund t'ju ndihmojmë?",
    callWaiter: "Thirr Kamerieren",
    requestBill: "Kërko Faturën",
    orderMenu: "Porosit nga Menu",
    askStaff: "Pyet Stafin",
    rateUs: "Na Vlerëso",
    placeholder: "Nr. Tavolinës",
    hint: "Shkruani nr. tavolinës ose ku ndodheni",
    successWaiter: "Thirrja u dërgua!",
    successWaiterDesc: "Kamarieri do të vijë së shpejti në tavolinën tuaj.",
    successBill: "Kërkesa u dërgua!",
    successBillDesc: "Fatura do të përgatitet për ju.",
    error: "Gabim në dërgimin e kërkesës",
    errorWaiter: "Gabim në dërgimin e thirrjes",
    tableRequired: "Shkruani numrin e tavolinës",
    subtitle: "Café Elbasan · Eat · Drink · Connect",
  },
  en: {
    table: "Table",
    chooseService: "Welcome! How can we help you?",
    callWaiter: "Call Waiter",
    requestBill: "Request Bill",
    orderMenu: "Order from Menu",
    askStaff: "Ask Staff",
    rateUs: "Rate Us",
    placeholder: "Table Nr.",
    hint: "Enter table nr. or where you are",
    successWaiter: "Call sent!",
    successWaiterDesc: "The waiter will arrive at your table shortly.",
    successBill: "Request sent!",
    successBillDesc: "The bill will be prepared for you.",
    error: "Error sending request",
    errorWaiter: "Error sending call",
    tableRequired: "Enter the table number",
    subtitle: "Café Elbasan · Eat · Drink · Connect",
  },
};

/* Cocktail SVG icon */
const CocktailIcon = () => (
  <svg viewBox="0 0 48 48" className="w-[50px] h-[50px] mx-auto mb-4" style={{ fill: 'none', stroke: '#e8c76d', strokeWidth: 1.5, filter: 'drop-shadow(0 0 8px rgba(232,199,109,0.4))' }}>
    <path d="M8 8h32L28 24v12h4a2 2 0 0 1 2 2v2H14v-2a2 2 0 0 1 2-2h4V24L8 8z" />
    <line x1="8" y1="8" x2="40" y2="8" strokeLinecap="round" />
    <circle cx="30" cy="14" r="1.5" fill="#e8c76d" stroke="none" opacity="0.6" />
    <circle cx="22" cy="12" r="1" fill="#e8c76d" stroke="none" opacity="0.4" />
  </svg>
);

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];

  const tableParam = searchParams.get("tabela") || searchParams.get("table");
  const [tableNumber, setTableNumber] = useState(tableParam || "");
  const [chatOpen, setChatOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const { checkLocation, checking } = useGeolocation();

  const withGeoCheck = async (action: () => Promise<void>) => {
    await action();
  };

  useEffect(() => {
    if (shouldRedirectToStaff()) {
      window.location.replace("/staff");
    }
  }, []);

  useEffect(() => {
    if (tableParam) {
      setTableNumber(tableParam);
    }
  }, [tableParam]);

  const displayTable = tableNumber || t.table;

  const handleConfirmTable = () => {
    if (!tableNumber.trim()) {
      toast.error(t.tableRequired);
    }
  };

  const handleCallWaiter = async () => {
    try {
      const { error } = await supabase.from("service_requests").insert({
        table_number: displayTable,
        request_type: "waiter",
        status: "pending",
      });
      if (error) throw error;
      toast.success(t.successWaiter, { description: t.successWaiterDesc, duration: 4000 });
    } catch (error) {
      console.error("Error calling waiter:", error);
      toast.error(t.errorWaiter);
    }
  };

  const handleRequestBill = async () => {
    try {
      const { error } = await supabase.from("service_requests").insert({
        table_number: displayTable,
        request_type: "bill",
        status: "pending",
      });
      if (error) throw error;
      toast.success(t.successBill, { description: t.successBillDesc, duration: 4000 });
    } catch (error) {
      console.error("Error requesting bill:", error);
      toast.error(t.error);
    }
  };

  /* Shared button styles */
  const btnDark: React.CSSProperties = {
    width: '100%',
    padding: '18px 20px',
    borderRadius: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    background: 'linear-gradient(180deg, #1a1f2e 0%, #0f1419 100%)',
    color: '#e8dcc0',
    border: '1px solid #c9a35c',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  };

  const btnGold: React.CSSProperties = {
    width: '100%',
    padding: '18px 20px',
    borderRadius: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    background: 'linear-gradient(180deg, #f4c430 0%, #d4af37 30%, #b8860b 70%, #8d5720 100%)',
    color: '#1a0f00',
    border: 'none',
    boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  };

  const goldHighlight = (
    <span className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)' }} />
  );

  const goldShimmer = (delay: number) => (
    <span className="absolute inset-0 pointer-events-none rounded-full overflow-hidden" aria-hidden="true">
      <span className="absolute inset-0" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 45%, rgba(255,240,180,0.15) 50%, rgba(255,255,255,0.2) 55%, transparent 70%)', animation: `gold-shimmer-sweep 4s ease-in-out ${delay}s infinite` }} />
    </span>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(255,215,0,0.15) 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, rgba(255,236,139,0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(138,90,43,0.2) 0%, transparent 70%),
          linear-gradient(135deg, #1a0f0c 0%, #2d1b15 25%, #3d2418 50%, #2d1b15 75%, #1a0f0c 100%)
        `,
      }}
    >
      {/* Bokeh blur overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 25%, rgba(255,215,0,0.08) 0%, transparent 25%),
            radial-gradient(circle at 85% 15%, rgba(255,236,139,0.12) 0%, transparent 30%),
            radial-gradient(circle at 75% 85%, rgba(218,165,32,0.1) 0%, transparent 35%),
            radial-gradient(circle at 25% 75%, rgba(184,134,11,0.08) 0%, transparent 40%)
          `,
          filter: 'blur(40px)',
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          opacity: 0.025,
        }}
      />

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLanguage}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            border: '1px solid rgba(201,163,92,0.15)',
            backdropFilter: 'blur(10px)',
            color: '#c9a35c',
          }}
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>

      {/* ═══ PHONE MOCKUP ═══ */}
      <div
        className="relative z-10 phone-mockup"
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'linear-gradient(145deg, #d4af37 0%, #b8860b 50%, #8d5720 100%)',
          borderRadius: '50px',
          padding: '8px',
          boxShadow: '0 50px 100px rgba(0,0,0,0.6), 0 30px 60px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {/* Screen */}
        <div
          className="w-full relative overflow-hidden"
          style={{
            background: '#0a0c10',
            borderRadius: '42px',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
          }}
        >
          {/* Glass reflection */}
          <div
            className="absolute inset-0 pointer-events-none z-[100]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 50%)',
              borderRadius: '42px',
            }}
          />

          {/* App content area — scrollable */}
          <div
            className="relative flex flex-col items-center overflow-y-auto"
            style={{
              padding: '40px 24px',
              maxHeight: '784px',
              background: `
                radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.03) 0%, transparent 50%),
                radial-gradient(ellipse at 0% 100%, rgba(107,74,45,0.08) 0%, transparent 40%),
                radial-gradient(ellipse at 100% 50%, rgba(61,48,37,0.05) 0%, transparent 30%),
                #0a0c10
              `,
            }}
          >
            {/* Inner noise */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                opacity: 0.025,
              }}
            />

            {/* Light rays */}
            <div
              className="absolute -top-[50px] left-1/2 -translate-x-1/2 w-[300px] h-[200px] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />

            {/* ═══ HEADER ═══ */}
            <div
              className="w-full relative mb-8"
              style={{
                background: 'linear-gradient(180deg, #151821 0%, #0d1117 100%)',
                border: '1px solid #d4af37',
                borderRadius: '20px',
                padding: '30px 20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.1), 0 0 0 1px rgba(0,0,0,0.5)',
                textAlign: 'center',
              }}
            >
              {/* Bottom gold line */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[60%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)' }} />

              <CocktailIcon />

              <h1
                className="font-display font-semibold uppercase mb-2"
                style={{ fontSize: '32px', letterSpacing: '6px', color: '#e8dcc0', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                BOULEVARD
              </h1>
              <p className="uppercase" style={{ fontSize: '10px', letterSpacing: '2px', color: '#a09070' }}>
                {t.subtitle}
              </p>
            </div>

            {/* Section title */}
            <h2
              className="font-display font-semibold uppercase mb-5 text-center"
              style={{ fontSize: '18px', letterSpacing: '2px', color: '#d4af37', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >
              BOULEVARD CAFÉ ELBASAN
            </h2>

            {/* Table input */}
            <div className="w-full mb-4">
              <div
                className="flex items-center rounded-full overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #1a1f2e 0%, #0f1419 100%)',
                  border: '1px solid #c9a35c',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <div className="pl-5">
                  <MapPin className="w-5 h-5" style={{ color: '#e8c76d' }} />
                </div>
                <input
                  type="text"
                  placeholder={t.placeholder}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="flex-1 px-3 py-[18px] bg-transparent outline-none text-center font-sans font-medium placeholder:opacity-30"
                  style={{ color: '#e8dcc0', fontSize: '15px' }}
                />
                <button
                  onClick={handleConfirmTable}
                  className="w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center mr-3 transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: 'linear-gradient(145deg, #f4c430 0%, #d4af37 50%, #b8860b 100%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <Check className="w-4 h-4" style={{ color: '#1a0f00', strokeWidth: 3 }} />
                </button>
              </div>
            </div>

            {/* Welcome */}
            <p className="font-sans italic mb-5" style={{ fontSize: '13px', color: '#9a8a6a', fontWeight: 300, letterSpacing: '0.5px' }}>
              {t.chooseService}
            </p>

            {/* ═══ BUTTONS ═══ */}
            <div className="w-full flex flex-col gap-3.5 relative z-10">
              {/* Call Waiter — Dark */}
              <button onClick={() => withGeoCheck(handleCallWaiter)} disabled={checking} style={btnDark} className="disabled:opacity-50">
                <Bell className="h-5 w-5 flex-shrink-0" style={{ color: '#e8dcc0' }} />
                <span>{t.callWaiter}</span>
              </button>

              {/* Request Bill — Gold */}
              <button onClick={() => withGeoCheck(handleRequestBill)} disabled={checking} style={btnGold} className="disabled:opacity-50">
                {goldHighlight}
                {goldShimmer(1)}
                <Receipt className="h-5 w-5 flex-shrink-0 relative z-10" style={{ color: '#1a0f00' }} />
                <span className="relative z-10">{t.requestBill}</span>
              </button>

              {/* Order from Menu — Dark */}
              <button onClick={() => navigate(`/menu?tabela=${displayTable}`)} style={btnDark}>
                <UtensilsCrossed className="h-5 w-5 flex-shrink-0" style={{ color: '#e8dcc0' }} />
                <span>{t.orderMenu}</span>
              </button>

              {/* Ask Staff — Gold */}
              <button onClick={() => setChatOpen(true)} style={btnGold}>
                {goldHighlight}
                {goldShimmer(2.5)}
                <MessageCircle className="h-5 w-5 flex-shrink-0 relative z-10" style={{ color: '#1a0f00' }} />
                <span className="relative z-10">{t.askStaff}</span>
              </button>

              {/* Rate Us — Dark */}
              <button onClick={() => setFeedbackOpen(true)} style={btnDark}>
                <Star className="h-5 w-5 flex-shrink-0" style={{ color: '#e8dcc0', fill: 'none' }} />
                <span>{t.rateUs}</span>
              </button>
            </div>

            {/* Hidden manager link */}
            <button onClick={() => navigate("/manager-login")} className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.04)' }}>•</button>
          </div>
        </div>
      </div>

      <StaffChatDialog open={chatOpen} onOpenChange={setChatOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} tableNumber={displayTable} language={language} />

      {showGreeting && (
        <WelcomeGreeting
          language={language}
          onDismiss={() => setShowGreeting(false)}
          onOpenChat={() => setChatOpen(true)}
        />
      )}

      {/* Mobile-responsive phone styles */}
      <style>{`
        @media (max-width: 420px) {
          .phone-mockup {
            max-width: 100% !important;
            border-radius: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            min-height: 100vh;
          }
          .phone-mockup > div {
            border-radius: 0 !important;
            min-height: 100vh;
          }
        }
      `}</style>
    </div>
  );
};

export default Index;
