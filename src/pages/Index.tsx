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
      style={{ background: 'linear-gradient(180deg, hsl(225 40% 5%) 0%, hsl(220 45% 7%) 30%, hsl(225 35% 8%) 60%, hsl(30 20% 6%) 80%, hsl(220 40% 4%) 100%)' }}
    >
      {/* Ambient gold glow - top right */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(35 75% 45% / 0.15), hsl(38 80% 50% / 0.06) 40%, transparent 65%)', filter: 'blur(50px)' }}
      />
      {/* Ambient gold glow - bottom left */}
      <div className="absolute -bottom-40 -left-32 w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(35 70% 42% / 0.2), hsl(38 75% 45% / 0.08) 40%, transparent 60%)', filter: 'blur(60px)' }}
      />
      {/* Ambient gold glow - bottom right */}
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(30 70% 40% / 0.12), transparent 55%)', filter: 'blur(55px)' }}
      />

      {/* Large bokeh particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { size: 200, x: '0%', y: '5%', opacity: 0.22, blur: 40, delay: 0 },
          { size: 140, x: '75%', y: '50%', opacity: 0.28, blur: 28, delay: 1 },
          { size: 90, x: '85%', y: '10%', opacity: 0.2, blur: 22, delay: 2 },
          { size: 170, x: '10%', y: '70%', opacity: 0.18, blur: 35, delay: 0.5 },
          { size: 60, x: '50%', y: '30%', opacity: 0.35, blur: 16, delay: 1.5 },
          { size: 220, x: '60%', y: '82%', opacity: 0.2, blur: 50, delay: 3 },
          { size: 50, x: '30%', y: '42%', opacity: 0.4, blur: 14, delay: 2.5 },
          { size: 150, x: '0%', y: '88%', opacity: 0.22, blur: 32, delay: 1.8 },
          { size: 70, x: '68%', y: '25%', opacity: 0.3, blur: 16, delay: 0.8 },
          { size: 250, x: '35%', y: '92%', opacity: 0.15, blur: 55, delay: 2.2 },
          { size: 80, x: '90%', y: '70%', opacity: 0.25, blur: 20, delay: 1.2 },
          { size: 120, x: '45%', y: '5%', opacity: 0.18, blur: 28, delay: 0.3 },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: `radial-gradient(circle, hsl(38 80% 55% / ${p.opacity}), hsl(30 60% 40% / ${p.opacity * 0.3}), transparent 70%)`,
              left: p.x,
              top: p.y,
              animation: `particle-float ${6 + i * 0.7}s ease-in-out ${p.delay}s infinite`,
              filter: `blur(${p.blur}px)`,
            }}
          />
        ))}
      </div>

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, hsl(0 0% 0% / 0.65) 100%)' }}
      />

      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLanguage}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            background: 'hsl(0 0% 100% / 0.08)',
            border: '1px solid hsl(0 0% 100% / 0.12)',
            backdropFilter: 'blur(10px)',
            color: 'hsl(43 85% 55%)',
          }}
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>

      {/* Main Card */}
      <div
        className="w-full max-w-[400px] rounded-[28px] p-6 text-center space-y-5 relative z-10 animate-in-stagger-1 bottom-reflection"
        style={{
          background: 'linear-gradient(180deg, hsl(220 45% 9% / 0.92) 0%, hsl(220 40% 7% / 0.94) 50%, hsl(220 35% 5% / 0.96) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1.5px solid hsl(43 85% 55% / 0.4)',
          boxShadow: '0 30px 100px -25px hsl(0 0% 0% / 0.9), 0 0 60px hsl(43 85% 55% / 0.15), 0 0 120px hsl(43 85% 55% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 -1px 0 hsl(0 0% 0% / 0.4)',
        }}
      >
        {/* Logo Header */}
        <div className="rounded-2xl overflow-hidden animate-in-stagger-2 relative"
          style={{
            border: '1px solid hsl(43 85% 55% / 0.2)',
            boxShadow: '0 10px 40px -10px hsl(220 60% 10% / 0.8), 0 0 20px hsl(43 85% 55% / 0.06)',
          }}
        >
          <img src={logo} alt="Boulevard Café Logo" className="w-full h-auto object-cover relative z-10" />
          {/* Bottom light flare */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20"
            style={{
              background: 'linear-gradient(90deg, transparent 5%, hsl(43 85% 60% / 0.5) 30%, hsl(43 90% 70% / 0.8) 50%, hsl(43 85% 60% / 0.5) 70%, transparent 95%)',
              boxShadow: '0 0 10px hsl(43 85% 55% / 0.3)',
            }}
          />
        </div>

        {/* Gold Divider */}
        <div className="flex items-center justify-center animate-in-stagger-2">
          <div className="h-[1px] flex-1" style={{ background: 'linear-gradient(90deg, transparent, hsl(43 85% 55% / 0.4), transparent)' }} />
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
              background: 'linear-gradient(135deg, hsl(220 60% 12%) 0%, hsl(220 50% 16%) 100%)',
              border: '1.5px solid hsl(43 85% 55% / 0.35)',
              boxShadow: 'inset 0 2px 4px hsl(0 0% 0% / 0.3), 0 0 18px hsl(43 85% 55% / 0.12)',
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
        <p className="font-display text-sm animate-in-stagger-4" style={{ color: 'hsl(220 10% 55%)' }}>
          {t.chooseService}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3.5">
          {/* Call Waiter - Navy */}
          <button
            onClick={() => withGeoCheck(handleCallWaiter)}
            disabled={checking}
            className="group service-btn-navy animate-in-stagger-4 disabled:opacity-50"
          >
            <Bell className="h-5 w-5 scale-bounce-hover" style={{ color: 'hsl(43 85% 55%)' }} />
            <span>{t.callWaiter}</span>
          </button>

          {/* Request Bill - Gold */}
          <button
            onClick={() => withGeoCheck(handleRequestBill)}
            disabled={checking}
            className="group service-btn-gold animate-in-stagger-5 disabled:opacity-50"
          >
            <Receipt className="h-5 w-5 scale-bounce-hover" />
            <span>{t.requestBill}</span>
          </button>

          {/* Order from Menu - Navy */}
          <button
            onClick={() => navigate(`/menu?tabela=${displayTable}`)}
            className="group service-btn-navy animate-in-stagger-5"
          >
            <UtensilsCrossed className="h-5 w-5 scale-bounce-hover" style={{ color: 'hsl(43 85% 55%)' }} />
            <span>{t.orderMenu}</span>
          </button>

          {/* Ask Staff - Gold */}
          <button
            onClick={() => setChatOpen(true)}
            className="group service-btn-gold animate-in-stagger-6"
          >
            <MessageCircle className="h-5 w-5 scale-bounce-hover" />
            <span>{t.askStaff}</span>
          </button>

          {/* Rate Us - Outline */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="group service-btn-outline animate-in-stagger-7"
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
