import { useState, useEffect } from "react";
import { StaffChatDialog } from "@/components/StaffChatDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { WelcomeGreeting } from "@/components/WelcomeGreeting";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Languages } from "lucide-react";

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
    tableLabel: "Nr. Tavolinës",
    chooseService: "Mirë se erdhët! Si mund t'ju ndihmojmë?",
    callWaiter: "Thirr Kamerieren",
    requestBill: "Kërko Faturën",
    orderMenu: "Porosit nga Menu",
    askStaff: "Pyet Stafin",
    rateUs: "Na Vlerëso",
    placeholder: "Nr. Tavolinës",
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
    tableLabel: "Table Nr.",
    chooseService: "Welcome! How can we help you?",
    callWaiter: "Call Waiter",
    requestBill: "Request Bill",
    orderMenu: "Order from Menu",
    askStaff: "Ask Staff",
    rateUs: "Rate Us",
    placeholder: "Table Nr.",
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

/* ═══ CUSTOM SVG ICONS (line art, stroke 1.5px) ═══ */
const IconCocktail = () => (
  <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="#e8c76d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 12px rgba(232,199,109,0.5))' }}>
    <path d="M10 10h28L27 24v12h3.5a1.5 1.5 0 0 1 1.5 1.5V39H16v-1.5a1.5 1.5 0 0 1 1.5-1.5H21V24L10 10z" />
    <line x1="10" y1="10" x2="38" y2="10" />
    <circle cx="28" cy="15" r="1.2" fill="#e8c76d" stroke="none" opacity="0.5" />
    <circle cx="21" cy="13" r="0.8" fill="#e8c76d" stroke="none" opacity="0.3" />
    <path d="M32 8c2-3 5-2 4 0" strokeWidth="1" opacity="0.4" />
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#e8c76d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21c-4-4-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 7-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1a0f00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 12 10 18 20 6" />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    <line x1="12" y1="2" x2="12" y2="4" />
  </svg>
);

const IconReceipt = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2H4z" />
    <line x1="8" y1="7" x2="16" y2="7" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="12" y2="15" />
  </svg>
);

const IconUtensils = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2" />
    <line x1="6" y1="2" x2="6" y2="22" />
    <path d="M18 2c-2 0-4 2-4 5s2 5 4 5V2z" />
    <line x1="18" y1="12" x2="18" y2="22" />
  </svg>
);

const IconChat = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="8" y1="9" x2="16" y2="9" opacity="0.5" />
    <line x1="8" y1="13" x2="13" y2="13" opacity="0.5" />
  </svg>
);

const IconStar = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
  const [tableEditing, setTableEditing] = useState(false);
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

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 50% 50%, #2d1b15 0%, #1a0f0c 100%)
        `,
      }}
    >
      {/* ═══ BOKEH LAYER — many small blurred circles ═══ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large soft bokeh */}
        <div className="absolute" style={{ width: 180, height: 180, top: '8%', left: '5%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute" style={{ width: 220, height: 220, top: '60%', right: '2%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(218,165,32,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute" style={{ width: 140, height: 140, bottom: '15%', left: '10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,236,139,0.09) 0%, transparent 70%)', filter: 'blur(45px)' }} />
        {/* Medium bokeh */}
        <div className="absolute" style={{ width: 90, height: 90, top: '20%', right: '20%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <div className="absolute" style={{ width: 70, height: 70, top: '45%', left: '25%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,134,11,0.14) 0%, transparent 70%)', filter: 'blur(25px)' }} />
        <div className="absolute" style={{ width: 100, height: 100, bottom: '30%', right: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)', filter: 'blur(35px)' }} />
        <div className="absolute" style={{ width: 60, height: 60, top: '75%', left: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,236,139,0.12) 0%, transparent 70%)', filter: 'blur(20px)' }} />
        {/* Small bokeh dots */}
        <div className="absolute" style={{ width: 40, height: 40, top: '12%', left: '55%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)', filter: 'blur(15px)' }} />
        <div className="absolute" style={{ width: 35, height: 35, top: '35%', right: '10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(218,165,32,0.16) 0%, transparent 70%)', filter: 'blur(12px)' }} />
        <div className="absolute" style={{ width: 45, height: 45, bottom: '10%', right: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,200,50,0.14) 0%, transparent 70%)', filter: 'blur(18px)' }} />
        <div className="absolute" style={{ width: 30, height: 30, top: '55%', left: '8%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)', filter: 'blur(10px)' }} />
        <div className="absolute" style={{ width: 50, height: 50, top: '5%', right: '35%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,163,92,0.13) 0%, transparent 70%)', filter: 'blur(20px)' }} />
        <div className="absolute" style={{ width: 25, height: 25, bottom: '40%', left: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.22) 0%, transparent 70%)', filter: 'blur(8px)' }} />
        <div className="absolute" style={{ width: 55, height: 55, bottom: '5%', left: '70%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,134,11,0.11) 0%, transparent 70%)', filter: 'blur(22px)' }} />
      </div>

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10,5,3,0.6) 100%)',
      }} />

      {/* Noise texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        opacity: 0.035,
      }} />

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
          background: `linear-gradient(
            160deg,
            #e8c76d 0%,
            #d4af37 15%,
            #b8860b 40%,
            #8d5720 65%,
            #6b4513 85%,
            #4a2f0a 100%
          )`,
          borderRadius: '52px',
          padding: '9px',
          boxShadow: `
            0 60px 120px rgba(0,0,0,0.7),
            0 30px 60px rgba(0,0,0,0.5),
            inset 0 2px 3px rgba(255,240,200,0.4),
            inset 0 -2px 3px rgba(0,0,0,0.4),
            inset 2px 0 3px rgba(255,240,200,0.15),
            inset -2px 0 3px rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Bezel highlight line on top edge */}
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] rounded-full" style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,240,200,0.6), transparent)',
        }} />

        {/* Screen */}
        <div
          className="w-full relative overflow-hidden"
          style={{
            background: '#0a0c10',
            borderRadius: '44px',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9), inset 0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          {/* Glass reflection — diagonal */}
          <div
            className="absolute inset-0 pointer-events-none z-[100]"
            style={{
              background: `linear-gradient(
                140deg,
                rgba(255,255,255,0.1) 0%,
                rgba(255,255,255,0.04) 25%,
                transparent 45%,
                transparent 100%
              )`,
              borderRadius: '44px',
            }}
          />

          {/* App content area */}
          <div
            className="relative flex flex-col items-center overflow-y-auto"
            style={{
              padding: '44px 24px 32px',
              maxHeight: '780px',
              background: `
                linear-gradient(180deg,
                  #0a0c10 0%,
                  #0d1017 30%,
                  #111620 50%,
                  #18150f 80%,
                  #1a150e 100%
                )
              `,
            }}
          >
            {/* Inner noise */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              opacity: 0.035,
            }} />

            {/* Light rays from top */}
            <div className="absolute -top-[80px] left-1/2 -translate-x-1/2 w-[350px] h-[250px] pointer-events-none" style={{
              background: `
                radial-gradient(ellipse at 40% 0%, rgba(255,215,0,0.12) 0%, transparent 60%),
                radial-gradient(ellipse at 65% 10%, rgba(232,199,109,0.08) 0%, transparent 50%)
              `,
              filter: 'blur(40px)',
            }} />
            {/* Side light ray */}
            <div className="absolute top-[20%] -right-[30px] w-[150px] h-[300px] pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 100% 50%, rgba(201,163,92,0.06) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }} />

            {/* Inner vignette */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,3,1,0.4) 100%)',
              borderRadius: '44px',
            }} />

            {/* ═══ HEADER ═══ */}
            <div
              className="w-full relative mb-7"
              style={{
                background: `linear-gradient(
                  180deg,
                  #171c28 0%,
                  #111620 40%,
                  #0d1117 100%
                )`,
                border: '1.5px solid',
                borderImage: 'linear-gradient(180deg, #d4af37 0%, #8d5720 100%) 1',
                borderRadius: '22px',
                padding: '28px 20px 24px',
                boxShadow: `
                  0 12px 40px rgba(0,0,0,0.6),
                  inset 0 1px 0 rgba(255,215,0,0.12),
                  inset 0 -1px 0 rgba(0,0,0,0.5),
                  0 0 0 1px rgba(0,0,0,0.6),
                  0 0 30px rgba(212,175,55,0.04)
                `,
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              {/* Header inner vignette */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)',
                borderRadius: '22px',
              }} />

              {/* Top gold highlight line */}
              <div className="absolute top-0 left-[10%] right-[10%] h-[1px]" style={{
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
              }} />

              {/* Bottom gold highlight line */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[55%] h-[1px]" style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)',
              }} />

              <div className="relative z-10">
                <div className="flex justify-center mb-3">
                  <IconCocktail />
                </div>

                <h1
                  className="font-display font-semibold uppercase mb-1.5"
                  style={{
                    fontSize: '30px',
                    letterSpacing: '6px',
                    color: '#e8dcc0',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  }}
                >
                  BOULEVARD
                </h1>

                {/* Gold underline beneath BOULEVARD */}
                <div className="mx-auto mb-3 w-[50%] h-[1px]" style={{
                  background: 'linear-gradient(90deg, transparent 0%, #d4af37 30%, #e8c76d 50%, #d4af37 70%, transparent 100%)',
                }} />

                <p className="uppercase relative z-10" style={{
                  fontSize: '9.5px',
                  letterSpacing: '2.5px',
                  color: '#9a8a6a',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {t.subtitle}
                </p>
              </div>
            </div>

            {/* Section title */}
            <h2
              className="font-display font-semibold uppercase mb-4 text-center"
              style={{
                fontSize: '17px',
                letterSpacing: '2px',
                color: '#d4af37',
                textShadow: '0 2px 6px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.1)',
              }}
            >
              BOULEVARD CAFÉ ELBASAN
            </h2>

            {/* ═══ BUTTONS ═══ */}
            <div className="w-full flex flex-col gap-3 relative z-10">

              {/* 1. Table Number — Dark button with input */}
              <div className="relative">
                <div
                  className="w-full rounded-full flex items-center overflow-hidden"
                  style={{
                    background: 'linear-gradient(180deg, #1a1f2e 0%, #0f1419 100%)',
                    border: '1px solid #c9a35c',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
                    padding: '0',
                  }}
                >
                  {/* Glossy top overlay */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none rounded-t-full" style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
                  }} />
                  <div className="pl-5 flex-shrink-0 relative z-10">
                    <IconPin />
                  </div>
                  <input
                    type="text"
                    placeholder={t.tableLabel}
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="flex-1 px-3 py-[16px] bg-transparent outline-none text-center font-medium placeholder:opacity-40"
                    style={{
                      color: '#e8dcc0',
                      fontSize: '15px',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                  <div className="pr-3 flex-shrink-0 relative z-10">
                    <button
                      onClick={() => {
                        if (!tableNumber.trim()) {
                          toast.error(t.tableRequired);
                        }
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: 'linear-gradient(145deg, #f4c430 0%, #d4af37 40%, #b8860b 100%)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                      }}
                    >
                      <IconCheck />
                    </button>
                  </div>
                </div>
              </div>

              {/* Welcome text */}
              <p className="text-center italic my-1" style={{
                fontSize: '13px',
                color: '#9a8a6a',
                fontWeight: 300,
                letterSpacing: '0.5px',
                fontFamily: "'Inter', sans-serif",
              }}>
                {t.chooseService}
              </p>

              {/* 2. Call Waiter — Dark */}
              <button
                onClick={() => withGeoCheck(handleCallWaiter)}
                disabled={checking}
                className="blvd-btn-dark disabled:opacity-50"
              >
                <span className="blvd-btn-icon-dark"><IconBell /></span>
                <span>{t.callWaiter}</span>
              </button>

              {/* 3. Request Bill — GOLD */}
              <button
                onClick={() => withGeoCheck(handleRequestBill)}
                disabled={checking}
                className="blvd-btn-gold disabled:opacity-50"
              >
                <span className="blvd-btn-shimmer" />
                <span className="blvd-btn-icon-gold"><IconReceipt /></span>
                <span className="relative z-10">{t.requestBill}</span>
              </button>

              {/* 4. Order from Menu — Dark */}
              <button
                onClick={() => navigate(`/menu?tabela=${displayTable}`)}
                className="blvd-btn-dark"
              >
                <span className="blvd-btn-icon-dark"><IconUtensils /></span>
                <span>{t.orderMenu}</span>
              </button>

              {/* 5. Ask Staff — GOLD */}
              <button
                onClick={() => setChatOpen(true)}
                className="blvd-btn-gold"
              >
                <span className="blvd-btn-shimmer" style={{ animationDelay: '2s' }} />
                <span className="blvd-btn-icon-gold"><IconChat /></span>
                <span className="relative z-10">{t.askStaff}</span>
              </button>

              {/* 6. Rate Us — Dark */}
              <button
                onClick={() => setFeedbackOpen(true)}
                className="blvd-btn-dark"
              >
                <span className="blvd-btn-icon-dark"><IconStar /></span>
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

      {/* Styles */}
      <style>{`
        /* ═══ DARK BUTTON ═══ */
        .blvd-btn-dark {
          position: relative;
          width: 100%;
          padding: 16px 20px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          background: linear-gradient(180deg, #1e2336 0%, #141926 50%, #0f1419 100%);
          color: #e8dcc0;
          border: 1px solid rgba(201,163,92,0.5);
          box-shadow:
            0 4px 10px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.06),
            inset 0 -1px 0 rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        .blvd-btn-dark::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%);
          pointer-events: none;
          border-radius: 50px 50px 0 0;
        }
        .blvd-btn-dark:hover {
          border-color: rgba(201,163,92,0.7);
          box-shadow:
            0 6px 16px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 0 12px rgba(212,175,55,0.06);
          transform: translateY(-1px);
        }
        .blvd-btn-dark:active {
          transform: scale(0.98);
        }
        .blvd-btn-icon-dark {
          color: #e8c76d;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        /* ═══ GOLD BUTTON ═══ */
        .blvd-btn-gold {
          position: relative;
          width: 100%;
          padding: 16px 20px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          background: linear-gradient(
            180deg,
            #f0c040 0%,
            #daa520 20%,
            #c9962a 45%,
            #b8860b 70%,
            #8d5720 100%
          );
          color: #1a0f00;
          border: none;
          box-shadow:
            0 5px 12px rgba(0,0,0,0.45),
            inset 0 2px 0 rgba(255,255,255,0.35),
            inset 0 -2px 4px rgba(100,50,0,0.3);
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        /* Specular highlight */
        .blvd-btn-gold::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 45%;
          background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 60%, transparent 100%);
          pointer-events: none;
          border-radius: 50px 50px 0 0;
          z-index: 1;
        }
        /* Brushed metal noise */
        .blvd-btn-gold::after {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.08;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 128px;
          pointer-events: none;
          mix-blend-mode: overlay;
          z-index: 2;
          border-radius: 50px;
        }
        .blvd-btn-gold:hover {
          box-shadow:
            0 8px 20px rgba(0,0,0,0.5),
            inset 0 2px 0 rgba(255,255,255,0.4),
            inset 0 -2px 4px rgba(100,50,0,0.3),
            0 0 20px rgba(212,175,55,0.15);
          transform: translateY(-1px);
        }
        .blvd-btn-gold:active {
          transform: scale(0.98);
        }
        .blvd-btn-icon-gold {
          color: #1a0f00;
          flex-shrink: 0;
          position: relative;
          z-index: 3;
        }

        /* Shimmer sweep animation on gold buttons */
        .blvd-btn-shimmer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          overflow: hidden;
          border-radius: 50px;
        }
        .blvd-btn-shimmer::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 60%;
          background: linear-gradient(
            105deg,
            transparent 20%,
            rgba(255,255,255,0.2) 40%,
            rgba(255,240,180,0.15) 50%,
            rgba(255,255,255,0.2) 60%,
            transparent 80%
          );
          animation: gold-shimmer-sweep 4s ease-in-out infinite;
        }

        /* ═══ MOBILE RESPONSIVE ═══ */
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
