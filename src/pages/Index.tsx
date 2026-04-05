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

/* Desaturated gold bokeh — warm amber/brown, not bright yellow */
const bokehParticles = [
  { size: 180, x: '-3%', y: '8%', blur: 50, delay: 0, opacity: 0.12 },
  { size: 120, x: '82%', y: '45%', blur: 35, delay: 1.2, opacity: 0.15 },
  { size: 80, x: '88%', y: '8%', blur: 25, delay: 2.4, opacity: 0.14 },
  { size: 200, x: '8%', y: '75%', blur: 55, delay: 0.6, opacity: 0.1 },
  { size: 50, x: '50%', y: '22%', blur: 15, delay: 1.8, opacity: 0.2 },
  { size: 220, x: '55%', y: '90%', blur: 60, delay: 3.0, opacity: 0.08 },
  { size: 40, x: '28%', y: '40%', blur: 12, delay: 2.8, opacity: 0.22 },
  { size: 150, x: '-4%', y: '88%', blur: 42, delay: 1.5, opacity: 0.1 },
  { size: 60, x: '75%', y: '18%', blur: 18, delay: 0.9, opacity: 0.16 },
  { size: 100, x: '42%', y: '5%', blur: 30, delay: 0.3, opacity: 0.12 },
];

/* Dust/sparkle particles — tiny white/gold specks */
const dustParticles = [
  { x: '15%', y: '25%', size: 2, delay: 0 },
  { x: '72%', y: '55%', size: 1.5, delay: 1.5 },
  { x: '38%', y: '78%', size: 2, delay: 0.8 },
  { x: '85%', y: '15%', size: 1, delay: 2.2 },
  { x: '55%', y: '42%', size: 1.5, delay: 3.1 },
  { x: '22%', y: '62%', size: 2, delay: 1.1 },
  { x: '68%', y: '85%', size: 1, delay: 2.6 },
  { x: '48%', y: '12%', size: 1.5, delay: 0.4 },
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden grain-texture">

      {/* ═══ BACKGROUND LAYER ═══ */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0B0F14 0%, #111820 40%, #141A22 100%)',
        }}
      />

      {/* Ambient cinematic glow — soft, desaturated, NO neon */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 25% 15%, rgba(201,150,74,0.12), transparent 55%),
            radial-gradient(ellipse at 75% 80%, rgba(180,130,60,0.10), transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(160,120,50,0.06), transparent 60%)
          `,
        }}
      />

      {/* Center bloom — very soft */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-[35%]"
        style={{
          background: 'radial-gradient(ellipse, rgba(201,150,74,0.15), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Bokeh particles — warm desaturated amber */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {bokehParticles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: `radial-gradient(circle, rgba(201,150,74,${p.opacity}), transparent 70%)`,
              left: p.x,
              top: p.y,
              animation: `particle-drift ${7 + i * 0.8}s ease-in-out ${p.delay}s infinite`,
              filter: `blur(${p.blur}px)`,
            }}
          />
        ))}
      </div>

      {/* Dust / sparkle overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {dustParticles.map((d, i) => (
          <div
            key={`dust-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${d.size}px`,
              height: `${d.size}px`,
              background: i % 2 === 0
                ? 'rgba(255,255,255,0.35)'
                : 'rgba(220,185,120,0.4)',
              left: d.x,
              top: d.y,
              animation: `dust-float ${4 + i * 0.6}s ease-in-out ${d.delay}s infinite`,
              filter: 'blur(0.5px)',
            }}
          />
        ))}
      </div>

      {/* Deep vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(6,8,12,0.75) 100%)' }}
      />

      {/* ═══ LANGUAGE TOGGLE ═══ */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLanguage}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            border: '1px solid rgba(201,150,74,0.12)',
            backdropFilter: 'blur(10px)',
            color: '#C9964A',
          }}
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>

      {/* ═══ MAIN CARD ═══ */}
      <div
        className="w-full max-w-[400px] rounded-[30px] relative z-10 animate-in-stagger-1"
        style={{
          padding: '1.5px',
          background: 'linear-gradient(160deg, rgba(180,130,55,0.22) 0%, rgba(100,72,30,0.08) 25%, rgba(60,42,18,0.04) 50%, rgba(100,72,30,0.06) 75%, rgba(180,130,55,0.18) 100%)',
          boxShadow: '0 40px 100px -25px rgba(0,0,0,0.95), 0 0 50px rgba(160,115,45,0.03)',
        }}
      >
        {/* Panel edge highlight — very subtle top */}
        <div
          className="absolute top-0 left-16 right-16 h-px z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(201,150,74,0.2), rgba(220,175,90,0.3), rgba(201,150,74,0.2), transparent)',
          }}
        />

        {/* Panel content */}
        <div
          className="rounded-[29px] p-6 text-center space-y-5 relative bottom-reflection overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #111A25 0%, #0D141D 40%, #0A0F16 100%)',
          }}
        >
          {/* Panel inner grain texture */}
          <div
            className="absolute inset-0 rounded-[29px] pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 128 128\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'1.1\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              backgroundSize: '128px 128px',
            }}
          />
          {/* Inner edge glow */}
          <div
            className="absolute inset-0 rounded-[29px] pointer-events-none"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(201,150,74,0.04), inset 0 -1px 0 rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.2)',
            }}
          />
          {/* Panel inner vignette */}
          <div
            className="absolute inset-0 rounded-[29px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.35) 100%)',
            }}
          />

          {/* Logo — subtle dark frame, no bright border */}
          <div
            className="rounded-2xl overflow-hidden animate-in-stagger-2 relative"
            style={{
              border: '1px solid rgba(160,115,45,0.12)',
              boxShadow: '0 12px 35px -8px rgba(0,0,0,0.85), inset 0 0 20px rgba(0,0,0,0.3)',
            }}
          >
            <img src={logo} alt="Boulevard Café Logo" className="w-full h-auto object-cover relative z-10" />
            {/* Bottom edge reflection — subtle */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px z-20"
              style={{
                background: 'linear-gradient(90deg, transparent 8%, rgba(160,115,45,0.2) 35%, rgba(201,150,74,0.3) 50%, rgba(160,115,45,0.2) 65%, transparent 92%)',
              }}
            />
            {/* Top inner shadow */}
            <div
              className="absolute top-0 left-0 right-0 h-8 z-15 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.25), transparent)',
              }}
            />
          </div>

          {/* Gold Divider */}
          <div className="flex items-center justify-center animate-in-stagger-2">
            <div
              className="h-px flex-1 shimmer-overlay"
              style={{
                background: 'linear-gradient(90deg, transparent 5%, rgba(122,85,38,0.25) 30%, rgba(201,150,74,0.35) 50%, rgba(122,85,38,0.25) 70%, transparent 95%)',
              }}
            />
          </div>

          {/* Brand Title — dimmed gold, not bright */}
          <h2
            className="font-display font-bold text-lg tracking-[0.16em] animate-in-stagger-3 gradient-text-gold"
            style={{ opacity: 0.85 }}
          >
            BOULEVARD CAFÉ ELBASAN
          </h2>

          {/* Table Input */}
          <div className="animate-in-stagger-3">
            <div
              className="flex items-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, #0C1219 0%, #111820 50%, #0E141C 100%)',
                border: '1px solid rgba(201,150,74,0.15)',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), 0 0 10px rgba(201,150,74,0.04)',
              }}
            >
              <div className="pl-4">
                <MapPin className="w-5 h-5" style={{ color: '#C9964A' }} />
              </div>
              <input
                type="text"
                placeholder={t.placeholder}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="flex-1 px-3 py-3.5 bg-transparent outline-none text-center font-sans font-medium placeholder:opacity-30"
                style={{ color: '#EDEDED' }}
              />
              <button
                onClick={handleConfirmTable}
                className="w-11 h-11 min-w-[2.75rem] rounded-full flex items-center justify-center mr-1 font-bold transition-all duration-300 hover:opacity-90 active:scale-95"
                style={{
                  background: 'linear-gradient(180deg, #F6C56F 0%, #C9964A 50%, #7A5526 100%)',
                  color: '#3A2A14',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 8px rgba(201,150,74,0.15)',
                }}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#CFCFCF', opacity: 0.4 }}>{t.hint}</p>
          </div>

          {/* Welcome text */}
          <p
            className="font-sans text-sm italic animate-in-stagger-4"
            style={{ color: '#CFCFCF', opacity: 0.7 }}
          >
            {t.chooseService}
          </p>

          {/* ═══ ACTION BUTTONS ═══ */}
          <div className="flex flex-col gap-3 relative z-10">
            {/* Call Waiter — Dark */}
            <button
              onClick={() => withGeoCheck(handleCallWaiter)}
              disabled={checking}
              className="group service-btn-navy justify-center animate-in-stagger-4 disabled:opacity-50"
            >
              <Bell className="h-5 w-5 scale-bounce-hover" style={{ color: '#C9964A' }} />
              <span>{t.callWaiter}</span>
            </button>

            {/* Request Bill — Gold */}
            <button
              onClick={() => withGeoCheck(handleRequestBill)}
              disabled={checking}
              className="group service-btn-gold justify-center animate-in-stagger-5 disabled:opacity-50"
            >
              <Receipt className="h-5 w-5 scale-bounce-hover relative z-10" />
              <span className="relative z-10">{t.requestBill}</span>
            </button>

            {/* Order from Menu — Dark */}
            <button
              onClick={() => navigate(`/menu?tabela=${displayTable}`)}
              className="group service-btn-navy justify-center animate-in-stagger-5"
            >
              <UtensilsCrossed className="h-5 w-5 scale-bounce-hover" style={{ color: '#C9964A' }} />
              <span>{t.orderMenu}</span>
            </button>

            {/* Ask Staff — Gold */}
            <button
              onClick={() => setChatOpen(true)}
              className="group service-btn-gold justify-center animate-in-stagger-6"
            >
              <MessageCircle className="h-5 w-5 scale-bounce-hover relative z-10" />
              <span className="relative z-10">{t.askStaff}</span>
            </button>

            {/* Rate Us — Dark */}
            <button
              onClick={() => setFeedbackOpen(true)}
              className="group service-btn-navy justify-center animate-in-stagger-7"
            >
              <Star className="h-5 w-5 scale-bounce-hover" style={{ color: '#C9964A' }} />
              <span>{t.rateUs}</span>
            </button>
          </div>

          {/* Hidden manager link */}
          <button
            onClick={() => navigate("/manager-login")}
            className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.06)' }}
          >
            •
          </button>
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
