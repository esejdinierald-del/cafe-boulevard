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

/* Bronze-warm bokeh — depth-of-field effect with golden shimmer */
const bokehParticles = [
  // Large distant (blurry, low opacity) — background layer
  { size: 260, x: '-5%', y: '5%', blur: 70, delay: 0, opacity: 0.08 },
  { size: 300, x: '75%', y: '85%', blur: 80, delay: 1.5, opacity: 0.06 },
  { size: 220, x: '90%', y: '-5%', blur: 65, delay: 3.0, opacity: 0.07 },
  // Mid-distance (moderate blur)
  { size: 140, x: '20%', y: '70%', blur: 45, delay: 0.8, opacity: 0.12 },
  { size: 160, x: '65%', y: '30%', blur: 50, delay: 2.0, opacity: 0.10 },
  { size: 100, x: '85%', y: '50%', blur: 35, delay: 1.2, opacity: 0.14 },
  { size: 120, x: '10%', y: '40%', blur: 40, delay: 2.5, opacity: 0.11 },
  // Close-up (sharper, brighter) — foreground layer
  { size: 50, x: '30%', y: '20%', blur: 12, delay: 0.4, opacity: 0.22 },
  { size: 35, x: '55%', y: '65%', blur: 8, delay: 1.8, opacity: 0.25 },
  { size: 45, x: '78%', y: '15%', blur: 10, delay: 0.9, opacity: 0.20 },
  { size: 30, x: '42%', y: '88%', blur: 6, delay: 2.8, opacity: 0.28 },
  { size: 25, x: '15%', y: '55%', blur: 5, delay: 3.2, opacity: 0.24 },
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden grain-texture">

      {/* ═══ BACKGROUND — Bronze-dark warm base ═══ */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a110a 0%, #3a2722 30%, #2a1c14 60%, #150e08 100%)',
        }}
      />

      {/* Warm atmospheric haze — misty bronze fog */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(255,215,0,0.15), transparent 50%),
            radial-gradient(ellipse at 70% 75%, rgba(255,190,100,0.12), transparent 50%),
            radial-gradient(ellipse at 50% 45%, rgba(200,150,80,0.08), transparent 55%),
            radial-gradient(ellipse at 15% 80%, rgba(255,200,120,0.06), transparent 45%),
            radial-gradient(ellipse at 85% 25%, rgba(255,215,0,0.08), transparent 40%)
          `,
        }}
      />

      {/* Center bloom — golden warmth from below */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[85%] h-[45%]"
        style={{
          background: 'radial-gradient(ellipse, rgba(255,215,0,0.18), rgba(200,150,80,0.08) 50%, transparent 75%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Depth-of-field bokeh particles — layered near/far */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {bokehParticles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: `radial-gradient(circle, rgba(255,215,0,${p.opacity}) 0%, rgba(255,190,100,${p.opacity * 0.5}) 40%, transparent 70%)`,
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

      {/* Deep warm vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 25%, rgba(21,14,8,0.7) 70%, rgba(10,6,3,0.9) 100%)' }}
      />

      {/* Misty atmospheric fog overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          background: `
            radial-gradient(ellipse at 40% 30%, rgba(255,240,200,0.3), transparent 50%),
            radial-gradient(ellipse at 60% 70%, rgba(255,220,160,0.2), transparent 50%)
          `,
          filter: 'blur(80px)',
        }}
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

            {/* Request Bill — Gold + shimmer */}
            <button
              onClick={() => withGeoCheck(handleRequestBill)}
              disabled={checking}
              className="group service-btn-gold justify-center animate-in-stagger-5 disabled:opacity-50"
            >
              <span
                className="absolute inset-0 z-[3] pointer-events-none rounded-full overflow-hidden"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 45%, rgba(255,240,180,0.12) 50%, rgba(255,255,255,0.18) 55%, transparent 70%)',
                    animation: 'gold-shimmer-sweep 4s ease-in-out 1s infinite',
                  }}
                />
              </span>
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

            {/* Ask Staff — Gold + shimmer */}
            <button
              onClick={() => setChatOpen(true)}
              className="group service-btn-gold justify-center animate-in-stagger-6"
            >
              <span
                className="absolute inset-0 z-[3] pointer-events-none rounded-full overflow-hidden"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 45%, rgba(255,240,180,0.12) 50%, rgba(255,255,255,0.18) 55%, transparent 70%)',
                    animation: 'gold-shimmer-sweep 4s ease-in-out 2.5s infinite',
                  }}
                />
              </span>
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
