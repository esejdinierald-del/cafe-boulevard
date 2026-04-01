import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
    const result = await checkLocation(language);
    if (result.allowed) {
      await action();
    } else {
      toast.error(result.error);
    }
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
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLanguage}
          className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-primary-foreground hover:bg-navy-light transition-colors"
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>

      <div className="w-full max-w-sm bg-card rounded-3xl shadow-xl p-6 text-center space-y-4">
        {/* Logo Card */}
        <div className="bg-gradient-to-r from-navy to-navy-light rounded-xl p-6">
          <img src={logo} alt="Boulevard Café Logo" className="w-40 mx-auto h-auto object-contain" />
        </div>

        {/* Brand Title */}
        <h2 className="text-gold-brand font-display font-bold text-lg tracking-wide">
          BOULEVARD CAFÉ ELBASAN
        </h2>

        {/* Table Input */}
        <div className="flex items-center bg-navy rounded-full overflow-hidden">
          <div className="pl-4">
            <MapPin className="w-5 h-5 text-gold-brand" />
          </div>
          <input
            type="text"
            placeholder={t.placeholder}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="flex-1 px-3 py-3 text-primary-foreground bg-transparent outline-none text-center font-display font-bold placeholder:text-muted-foreground/50"
          />
          <button
            onClick={handleConfirmTable}
            className="bg-gold-brand px-4 py-3 text-navy font-bold hover:opacity-90 transition-opacity"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t.hint}</p>

        {/* Welcome text */}
        <p className="font-display font-semibold text-foreground">{t.chooseService}</p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {/* Navy button */}
          <button
            onClick={() => withGeoCheck(handleCallWaiter)}
            disabled={checking}
            className="bg-navy text-primary-foreground py-3.5 rounded-full font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-navy-light transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            <Bell className="h-5 w-5" />
            {t.callWaiter}
          </button>

          {/* Gold button */}
          <button
            onClick={() => withGeoCheck(handleRequestBill)}
            disabled={checking}
            className="bg-gradient-to-r from-gold-brand to-secondary text-navy py-3.5 rounded-full font-display font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 active:scale-[0.98]"
          >
            <Receipt className="h-5 w-5" />
            {t.requestBill}
          </button>

          {/* Navy button */}
          <button
            onClick={() => navigate(`/menu?tabela=${displayTable}`)}
            className="bg-navy text-primary-foreground py-3.5 rounded-full font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-navy-light transition-colors active:scale-[0.98]"
          >
            <UtensilsCrossed className="h-5 w-5" />
            {t.orderMenu}
          </button>

          {/* Gold button */}
          <button
            onClick={() => setChatOpen(true)}
            className="bg-gradient-to-r from-gold-brand to-secondary text-navy py-3.5 rounded-full font-display font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" />
            {t.askStaff}
          </button>

          {/* Outlined button */}
          <button
            onClick={() => setFeedbackOpen(true)}
            className="border border-border text-foreground py-3.5 rounded-full font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-muted transition-colors active:scale-[0.98]"
          >
            <Star className="h-5 w-5" />
            {t.rateUs}
          </button>
        </div>

        {/* Hidden manager link */}
        <button
          onClick={() => navigate("/manager-login")}
          className="text-xs text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
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
