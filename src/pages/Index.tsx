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
    subtitle: "Café Elbasan • Eat • Drink • Connect",
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
    subtitle: "Café Elbasan • Eat • Drink • Connect",
  },
};

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
    // GPS temporarily disabled for development
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden grain-texture"
      style={{ background: 'linear-gradient(180deg, #070B14 0%, #0D1321 30%, #111827 55%, #0D1321 75%, #070B14 100%)' }}
    >
      {/* Gold ambient glow - top right */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.18), rgba(201,162,74,0.08) 40%, transparent 65%)', filter: 'blur(60px)' }}
      />
      {/* Gold ambient glow - bottom left */}
      <div className="absolute -bottom-48 -left-40 w-[700px] h-[700px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.15), rgba(255,200,120,0.08) 40%, transparent 60%)', filter: 'blur(70px)' }}
      />
      {/* Gold ambient glow - bottom right */}
      <div className="absolute -bottom-32 -right-24 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.1), transparent 55%)', filter: 'blur(55px)' }}
      />
      {/* Center cinematic glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,200,120,0.06), transparent 50%)', filter: 'blur(90px)' }}
      />

      {/* GOLD bokeh particles — NOT brown */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { size: 200, x: '-2%', y: '5%', opacity: 0.2, blur: 45, delay: 0, color: 'rgba(255,215,0,0.25)' },
          { size: 140, x: '80%', y: '50%', opacity: 0.25, blur: 30, delay: 1, color: 'rgba(255,215,0,0.3)' },
          { size: 90, x: '90%', y: '10%', opacity: 0.22, blur: 22, delay: 2, color: 'rgba(201,162,74,0.3)' },
          { size: 180, x: '5%', y: '70%', opacity: 0.2, blur: 40, delay: 0.5, color: 'rgba(255,215,0,0.2)' },
          { size: 60, x: '55%', y: '25%', opacity: 0.35, blur: 14, delay: 1.5, color: 'rgba(255,230,100,0.4)' },
          { size: 240, x: '60%', y: '88%', opacity: 0.15, blur: 55, delay: 3, color: 'rgba(255,215,0,0.18)' },
          { size: 50, x: '30%', y: '38%', opacity: 0.4, blur: 12, delay: 2.5, color: 'rgba(255,230,100,0.45)' },
          { size: 160, x: '-5%', y: '92%', opacity: 0.18, blur: 38, delay: 1.8, color: 'rgba(255,215,0,0.2)' },
          { size: 70, x: '72%', y: '20%', opacity: 0.28, blur: 16, delay: 0.8, color: 'rgba(255,200,120,0.35)' },
          { size: 260, x: '35%', y: '95%', opacity: 0.12, blur: 60, delay: 2.2, color: 'rgba(255,215,0,0.15)' },
          { size: 80, x: '94%', y: '70%', opacity: 0.25, blur: 18, delay: 1.2, color: 'rgba(255,230,100,0.35)' },
          { size: 120, x: '45%', y: '3%', opacity: 0.18, blur: 28, delay: 0.3, color: 'rgba(201,162,74,0.25)' },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: `radial-gradient(circle, ${p.color}, transparent 70%)`,
              left: p.x,
              top: p.y,
              animation: `particle-float ${6 + i * 0.7}s ease-in-out ${p.delay}s infinite`,
              filter: `blur(${p.blur}px)`,
            }}
          />
        ))}
      </div>

      {/* White sparkle noise overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 15%, rgba(255,255,255,0.08) 0%, transparent 1px),
            radial-gradient(circle at 80% 25%, rgba(255,255,255,0.06) 0%, transparent 1px),
            radial-gradient(circle at 45% 60%, rgba(255,255,255,0.05) 0%, transparent 1px),
            radial-gradient(circle at 70% 80%, rgba(255,255,255,0.07) 0%, transparent 1px),
            radial-gradient(circle at 15% 75%, rgba(255,255,255,0.04) 0%, transparent 1px),
            radial-gradient(circle at 90% 55%, rgba(255,255,255,0.06) 0%, transparent 1px)`,
          animation: 'shimmer 4s ease-in-out infinite',
        }}
      />

      {/* Vignette overlay - deeper */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.75) 100%)' }}
      />

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLanguage}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,215,0,0.15)',
            backdropFilter: 'blur(12px)',
            color: 'hsl(48 85% 55%)',
            boxShadow: '0 0 15px rgba(255,215,0,0.05)',
          }}
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>

      {/* Main Card with metallic gold frame + edge glow */}
      <div
        className="w-full max-w-[400px] rounded-[24px] relative z-10 animate-in-stagger-1"
        style={{
          padding: '2.5px',
          background: 'linear-gradient(160deg, rgba(255,215,0,0.55) 0%, rgba(201,162,74,0.25) 20%, rgba(140,106,47,0.1) 40%, rgba(201,162,74,0.2) 60%, rgba(255,215,0,0.4) 80%, rgba(184,150,62,0.55) 100%)',
          boxShadow: '0 30px 100px -25px rgba(0,0,0,0.95), 0 0 60px rgba(255,215,0,0.08), 0 0 120px rgba(255,200,120,0.04)',
        }}
      >
        {/* Edge glow - top */}
        <div className="absolute top-0 left-8 right-8 h-[2px] z-20 pointer-events-none rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.6), rgba(255,230,100,0.8), rgba(255,215,0,0.6), transparent)', filter: 'blur(0.5px)' }}
        />
        {/* Edge glow - bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-[2px] z-20 pointer-events-none rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.5), rgba(255,230,100,0.7), rgba(255,215,0,0.5), transparent)', filter: 'blur(0.5px)' }}
        />

        <div
          className="rounded-[22px] p-6 text-center space-y-5 relative bottom-reflection"
          style={{
            background: 'linear-gradient(180deg, rgba(13,19,33,0.98) 0%, rgba(7,11,20,0.99) 50%, rgba(7,11,20,1) 100%)',
            backdropFilter: 'blur(30px)',
          }}
        >
          {/* Inner container edge glow */}
          <div className="absolute inset-0 rounded-[22px] pointer-events-none"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,215,0,0.08), inset 0 -1px 0 rgba(0,0,0,0.5)' }}
          />

        {/* Logo Header */}
        <div className="rounded-2xl overflow-hidden animate-in-stagger-2 relative"
          style={{
            border: '1.5px solid rgba(255,215,0,0.25)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.9), 0 0 20px rgba(255,215,0,0.06)',
          }}
        >
          <img src={logo} alt="Boulevard Café Logo" className="w-full h-auto object-cover relative z-10" />
          {/* Bottom light flare */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20"
            style={{
              background: 'linear-gradient(90deg, transparent 3%, rgba(201,162,74,0.5) 25%, rgba(255,215,0,0.8) 50%, rgba(201,162,74,0.5) 75%, transparent 97%)',
              boxShadow: '0 0 12px rgba(255,215,0,0.3), 0 0 25px rgba(255,215,0,0.1)',
            }}
          />
        </div>

        {/* Gold Divider */}
        <div className="flex items-center justify-center animate-in-stagger-2">
          <div className="h-[2px] flex-1" style={{ background: 'linear-gradient(90deg, transparent 5%, hsl(43 85% 55% / 0.5) 30%, hsl(43 90% 65% / 0.7) 50%, hsl(43 85% 55% / 0.5) 70%, transparent 95%)', boxShadow: '0 0 8px hsl(43 85% 55% / 0.2)' }} />
        </div>

        {/* Brand Title */}
        <h2 className="font-display font-bold text-lg tracking-[0.18em] animate-in-stagger-3 gradient-text-gold" style={{ textShadow: '0 0 20px hsl(43 85% 55% / 0.2)' }}>
          BOULEVARD CAFÉ ELBASAN
        </h2>

        {/* Table Input */}
        <div className="animate-in-stagger-3">
          <div
            className="flex items-center rounded-full"
            style={{
              background: 'linear-gradient(135deg, hsl(220 60% 10%) 0%, hsl(220 50% 14%) 100%)',
              border: '1.5px solid hsl(43 85% 55% / 0.45)',
              boxShadow: 'inset 0 2px 4px hsl(0 0% 0% / 0.4), 0 0 22px hsl(43 85% 55% / 0.18), 0 0 40px hsl(43 85% 55% / 0.06)',
            }}
          >
            <div className="pl-4">
              <MapPin className="w-5 h-5" style={{ color: 'hsl(43 85% 55%)' }} />
            </div>
            <input
              type="text"
              placeholder={t.placeholder}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="flex-1 px-3 py-3.5 bg-transparent outline-none text-center font-display font-bold placeholder:opacity-40"
              style={{ color: 'hsl(0 0% 90%)' }}
            />
            <button
              onClick={handleConfirmTable}
              className="w-11 h-11 min-w-[2.75rem] rounded-full flex items-center justify-center mr-1 font-bold transition-all duration-300 hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, hsl(43 90% 58%), hsl(38 80% 45%))',
                color: 'hsl(220 60% 10%)',
                boxShadow: '0 0 12px hsl(43 85% 55% / 0.4)',
              }}
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'hsl(220 10% 50%)' }}>{t.hint}</p>
        </div>

        {/* Welcome text */}
        <p className="font-display text-sm italic animate-in-stagger-4" style={{ color: 'hsl(220 10% 55%)' }}>
          {t.chooseService}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Call Waiter - Navy */}
          <button
            onClick={() => withGeoCheck(handleCallWaiter)}
            disabled={checking}
            className="group service-btn-navy justify-center animate-in-stagger-4 disabled:opacity-50"
          >
            <Bell className="h-5 w-5 scale-bounce-hover" style={{ color: 'hsl(43 85% 55%)' }} />
            <span>{t.callWaiter}</span>
          </button>

          {/* Request Bill - Gold */}
          <button
            onClick={() => withGeoCheck(handleRequestBill)}
            disabled={checking}
            className="group service-btn-gold justify-center animate-in-stagger-5 disabled:opacity-50"
          >
            <Receipt className="h-5 w-5 scale-bounce-hover" />
            <span>{t.requestBill}</span>
          </button>

          {/* Order from Menu - Navy */}
          <button
            onClick={() => navigate(`/menu?tabela=${displayTable}`)}
            className="group service-btn-navy justify-center animate-in-stagger-5"
          >
            <UtensilsCrossed className="h-5 w-5 scale-bounce-hover" style={{ color: 'hsl(43 85% 55%)' }} />
            <span>{t.orderMenu}</span>
          </button>

          {/* Ask Staff - Gold */}
          <button
            onClick={() => setChatOpen(true)}
            className="group service-btn-gold justify-center animate-in-stagger-6"
          >
            <MessageCircle className="h-5 w-5 scale-bounce-hover" />
            <span>{t.askStaff}</span>
          </button>

          {/* Rate Us - Navy outline */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="group service-btn-navy justify-center animate-in-stagger-7"
          >
            <Star className="h-5 w-5 scale-bounce-hover" style={{ color: 'hsl(43 85% 55%)' }} />
            <span>{t.rateUs}</span>
          </button>
        </div>

        {/* Hidden manager link */}
        <button
          onClick={() => navigate("/manager-login")}
          className="text-xs transition-colors"
          style={{ color: 'hsl(0 0% 100% / 0.1)' }}
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
