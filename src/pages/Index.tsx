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

/* Warm gold bokeh — depth-of-field */
const bokehParticles = [
  { size: 220, x: '10%', y: '20%', blur: 60, delay: 0, opacity: 0.08 },
  { size: 280, x: '80%', y: '75%', blur: 75, delay: 1.5, opacity: 0.06 },
  { size: 160, x: '85%', y: '10%', blur: 50, delay: 2.5, opacity: 0.1 },
  { size: 120, x: '20%', y: '70%', blur: 40, delay: 0.8, opacity: 0.12 },
  { size: 180, x: '60%', y: '35%', blur: 55, delay: 2.0, opacity: 0.07 },
  { size: 80, x: '75%', y: '50%', blur: 30, delay: 1.2, opacity: 0.14 },
  { size: 50, x: '30%', y: '25%', blur: 12, delay: 0.4, opacity: 0.2 },
  { size: 40, x: '55%', y: '65%', blur: 10, delay: 1.8, opacity: 0.22 },
  { size: 35, x: '45%', y: '85%', blur: 8, delay: 2.8, opacity: 0.18 },
];

/* Sparkle particles — twinkling gold/white specks */
const sparkleParticles = [
  { x: '15%', y: '25%', size: 2.5, delay: 0, color: 'rgba(255,235,160,0.8)' },
  { x: '72%', y: '55%', size: 2, delay: 1.5, color: 'rgba(255,255,255,0.7)' },
  { x: '38%', y: '78%', size: 3, delay: 0.8, color: 'rgba(246,197,111,0.9)' },
  { x: '85%', y: '15%', size: 1.5, delay: 2.2, color: 'rgba(255,255,255,0.6)' },
  { x: '55%', y: '42%', size: 2, delay: 3.1, color: 'rgba(255,220,140,0.8)' },
  { x: '22%', y: '62%', size: 2.5, delay: 1.1, color: 'rgba(255,255,255,0.7)' },
  { x: '68%', y: '85%', size: 1.5, delay: 2.6, color: 'rgba(246,197,111,0.7)' },
  { x: '48%', y: '12%', size: 2, delay: 0.4, color: 'rgba(255,235,160,0.8)' },
  { x: '8%', y: '48%', size: 3, delay: 1.8, color: 'rgba(255,255,255,0.6)' },
  { x: '92%', y: '38%', size: 2, delay: 0.6, color: 'rgba(255,220,140,0.9)' },
  { x: '32%', y: '92%', size: 2.5, delay: 2.0, color: 'rgba(255,255,255,0.5)' },
  { x: '78%', y: '5%', size: 1.5, delay: 3.5, color: 'rgba(246,197,111,0.8)' },
  { x: '45%', y: '68%', size: 2, delay: 0.2, color: 'rgba(255,235,160,0.7)' },
  { x: '62%', y: '32%', size: 3, delay: 2.8, color: 'rgba(255,255,255,0.6)' },
];

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* ═══ BACKGROUND — Warm brown/bronze base ═══ */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(255,215,0,0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(255,236,139,0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(138,90,43,0.2) 0%, transparent 70%),
            linear-gradient(135deg, #1a0f0c 0%, #2d1b15 25%, #3d2418 50%, #2d1b15 75%, #1a0f0c 100%)
          `,
        }}
      />

      {/* Bokeh blur layer */}
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

      {/* Bokeh particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {bokehParticles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: `radial-gradient(circle, rgba(255,215,0,${p.opacity}) 0%, rgba(218,165,32,${p.opacity * 0.5}) 40%, transparent 70%)`,
              left: p.x,
              top: p.y,
              animation: `particle-drift ${8 + i * 0.7}s ease-in-out ${p.delay}s infinite`,
              filter: `blur(${p.blur}px)`,
            }}
          />
        ))}
      </div>

      {/* Twinkling sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {sparkleParticles.map((s, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${s.size}px`,
              height: `${s.size}px`,
              background: s.color,
              left: s.x,
              top: s.y,
              animation: `sparkle-twinkle ${2.5 + i * 0.4}s ease-in-out ${s.delay}s infinite`,
              boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
            }}
          />
        ))}
      </div>

      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          opacity: 0.025,
        }}
      />

      {/* ═══ LANGUAGE TOGGLE ═══ */}
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
        className="w-full max-w-[380px] relative z-10 animate-in-stagger-1"
        style={{
          background: 'linear-gradient(145deg, #d4af37 0%, #b8860b 50%, #8d5720 100%)',
          borderRadius: '50px',
          padding: '8px',
          boxShadow: '0 50px 100px rgba(0,0,0,0.6), 0 30px 60px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {/* Phone screen */}
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

          {/* App content */}
          <div
            className="relative flex flex-col items-center text-center"
            style={{
              padding: '40px 24px',
              background: `
                radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.03) 0%, transparent 50%),
                radial-gradient(ellipse at 0% 100%, rgba(107,74,45,0.08) 0%, transparent 40%),
                radial-gradient(ellipse at 100% 50%, rgba(61,48,37,0.05) 0%, transparent 30%),
                #0a0c10
              `,
            }}
          >
            {/* Inner noise texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                opacity: 0.025,
              }}
            />

            {/* Light rays from top */}
            <div
              className="absolute -top-[50px] left-1/2 -translate-x-1/2 w-[300px] h-[200px] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />

            {/* ═══ HEADER ═══ */}
            <div
              className="w-full relative mb-8 animate-in-stagger-2"
              style={{
                background: 'linear-gradient(180deg, #151821 0%, #0d1117 100%)',
                border: '1px solid #d4af37',
                borderRadius: '20px',
                padding: '30px 20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.1), 0 0 0 1px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header bottom gold line */}
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[60%] h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)' }}
              />

              {/* Logo */}
              <img
                src={logo}
                alt="Boulevard Café"
                className="w-14 h-14 mx-auto mb-4 rounded-xl object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(232,199,109,0.3))' }}
              />

              <h1
                className="font-display font-semibold tracking-[6px] uppercase mb-2"
                style={{
                  fontSize: '32px',
                  color: '#e8dcc0',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                BOULEVARD
              </h1>
              <p
                className="uppercase tracking-[2px]"
                style={{ fontSize: '10px', color: '#a09070' }}
              >
                {t.subtitle}
              </p>
            </div>

            {/* Section title */}
            <h2
              className="font-display font-semibold tracking-[2px] uppercase mb-5 animate-in-stagger-3"
              style={{
                fontSize: '18px',
                color: '#d4af37',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              BOULEVARD CAFÉ ELBASAN
            </h2>

            {/* Table Input */}
            <div className="w-full mb-4 animate-in-stagger-3">
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
                  className="w-[28px] h-[28px] min-w-[28px] rounded-full flex items-center justify-center mr-3 transition-all duration-300 hover:opacity-90 active:scale-95"
                  style={{
                    background: 'linear-gradient(145deg, #f4c430 0%, #d4af37 50%, #b8860b 100%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <Check className="w-4 h-4" style={{ color: '#1a0f00', strokeWidth: 3 }} />
                </button>
              </div>
            </div>

            {/* Welcome text */}
            <p
              className="font-sans italic mb-5 animate-in-stagger-4"
              style={{ fontSize: '13px', color: '#9a8a6a', fontWeight: 300, letterSpacing: '0.5px' }}
            >
              {t.chooseService}
            </p>

            {/* ═══ BUTTONS ═══ */}
            <div className="w-full flex flex-col gap-3.5 relative z-10">

              {/* Call Waiter — Dark */}
              <button
                onClick={() => withGeoCheck(handleCallWaiter)}
                disabled={checking}
                className="animate-in-stagger-4 disabled:opacity-50"
                style={{
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
                }}
              >
                <Bell className="h-5 w-5 flex-shrink-0" style={{ color: '#e8dcc0' }} />
                <span>{t.callWaiter}</span>
              </button>

              {/* Request Bill — Gold */}
              <button
                onClick={() => withGeoCheck(handleRequestBill)}
                disabled={checking}
                className="animate-in-stagger-5 disabled:opacity-50 relative overflow-hidden"
                style={{
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
                }}
              >
                {/* Gold top highlight */}
                <span className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)' }} />
                {/* Shimmer sweep */}
                <span className="absolute inset-0 pointer-events-none rounded-full overflow-hidden" aria-hidden="true">
                  <span className="absolute inset-0" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 45%, rgba(255,240,180,0.15) 50%, rgba(255,255,255,0.2) 55%, transparent 70%)', animation: 'gold-shimmer-sweep 4s ease-in-out 1s infinite' }} />
                </span>
                <Receipt className="h-5 w-5 flex-shrink-0 relative z-10" style={{ color: '#1a0f00' }} />
                <span className="relative z-10">{t.requestBill}</span>
              </button>

              {/* Order from Menu — Dark */}
              <button
                onClick={() => navigate(`/menu?tabela=${displayTable}`)}
                className="animate-in-stagger-5"
                style={{
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
                }}
              >
                <UtensilsCrossed className="h-5 w-5 flex-shrink-0" style={{ color: '#e8dcc0' }} />
                <span>{t.orderMenu}</span>
              </button>

              {/* Ask Staff — Gold */}
              <button
                onClick={() => setChatOpen(true)}
                className="animate-in-stagger-6 relative overflow-hidden"
                style={{
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
                }}
              >
                <span className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)' }} />
                <span className="absolute inset-0 pointer-events-none rounded-full overflow-hidden" aria-hidden="true">
                  <span className="absolute inset-0" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 45%, rgba(255,240,180,0.15) 50%, rgba(255,255,255,0.2) 55%, transparent 70%)', animation: 'gold-shimmer-sweep 4s ease-in-out 2.5s infinite' }} />
                </span>
                <MessageCircle className="h-5 w-5 flex-shrink-0 relative z-10" style={{ color: '#1a0f00' }} />
                <span className="relative z-10">{t.askStaff}</span>
              </button>

              {/* Rate Us — Dark */}
              <button
                onClick={() => setFeedbackOpen(true)}
                className="animate-in-stagger-7"
                style={{
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
                }}
              >
                <Star className="h-5 w-5 flex-shrink-0" style={{ color: '#e8dcc0', fill: 'none' }} />
                <span>{t.rateUs}</span>
              </button>
            </div>

            {/* Hidden manager link */}
            <button
              onClick={() => navigate("/manager-login")}
              className="text-xs transition-colors mt-4"
              style={{ color: 'rgba(255,255,255,0.04)' }}
            >
              •
            </button>
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
    </div>
  );
};

export default Index;
