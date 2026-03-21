import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Receipt, UtensilsCrossed, Facebook, Instagram, Languages, MessageCircle } from "lucide-react";
import { StaffChatDialog } from "@/components/StaffChatDialog";
import { TableIdentifier } from "@/components/TableIdentifier";
import { WelcomeGreeting } from "@/components/WelcomeGreeting";
import { toast } from "sonner";
import logo from "@/assets/boulevard-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useGeolocation } from "@/hooks/use-geolocation";

const STAFF_PWA_PREFERRED_KEY = "staff_pwa_preferred";

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const shouldRedirectToStaff = () =>
  Boolean(localStorage.getItem("staff_shift_token")) ||
  localStorage.getItem(STAFF_PWA_PREFERRED_KEY) === "1";

const translations = {
  sq: {
    welcome: "Mirë se vini",
    table: "Tavolinë",
    chooseService: "Zgjidhni shërbimin që dëshironi",
    callWaiter: "Thirr Kamarieren",
    requestBill: "Kërko Faturën",
    orderMenu: "Porosit nga Menu",
    askStaff: "Pyet Stafin",
    premium: "Premium Service",
    fast: "Fast & Elegant",
    footer: "Boulevard Café Elbasan",
    footerSub: "Where elegance meets excellence",
    successWaiter: "Thirrja u dërgua!",
    successWaiterDesc: "Kamarieri do të vijë së shpejti në tavolinën tuaj.",
    successBill: "Kërkesa u dërgua!",
    successBillDesc: "Fatura do të përgatitet për ju.",
    error: "Gabim në dërgimin e kërkesës",
    errorWaiter: "Gabim në dërgimin e thirrjes"
  },
  en: {
    welcome: "Welcome",
    table: "Table",
    chooseService: "Choose the service you want",
    callWaiter: "Call Waiter",
    requestBill: "Request Bill",
    orderMenu: "Order from Menu",
    askStaff: "Ask Staff",
    premium: "Premium Service",
    fast: "Fast & Elegant",
    footer: "Boulevard Café Elbasan",
    footerSub: "Where elegance meets excellence",
    successWaiter: "Call sent!",
    successWaiterDesc: "The waiter will arrive at your table shortly.",
    successBill: "Request sent!",
    successBillDesc: "The bill will be prepared for you.",
    error: "Error sending request",
    errorWaiter: "Error sending call"
  }
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];
  const [tableNumber, setTableNumber] = useState(t.table);
  const [chatOpen, setChatOpen] = useState(false);
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

  const isGenericTable = !searchParams.get("tabela") && !searchParams.get("table");

  useEffect(() => {
    if (shouldRedirectToStaff()) {
      window.location.replace("/staff");
    }
  }, []);

  useEffect(() => {
    const tableParam = searchParams.get("tabela") || searchParams.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
    } else {
      setTableNumber(t.table);
    }
  }, [searchParams, t.table]);

  const handleCallWaiter = async () => {
    try {
      const { error } = await (supabase as any).from('service_requests').insert({
        table_number: tableNumber,
        request_type: 'waiter',
        status: 'pending'
      });
      if (error) throw error;
      toast.success(t.successWaiter, {
        description: t.successWaiterDesc,
        duration: 4000
      });
    } catch (error) {
      console.error('Error calling waiter:', error);
      toast.error(t.errorWaiter);
    }
  };

  const handleRequestBill = async () => {
    try {
      const { error } = await (supabase as any).from('service_requests').insert({
        table_number: tableNumber,
        request_type: 'bill',
        status: 'pending'
      });
      if (error) throw error;
      toast.success(t.successBill, {
        description: t.successBillDesc,
        duration: 4000
      });
    } catch (error) {
      console.error('Error requesting bill:', error);
      toast.error(t.error);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 sm:p-6">
      {/* Coffee Background Image with enhanced overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${coffeeBackground})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/10" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-float" />

      {/* Language Toggle - Premium style */}
      <div className="absolute top-6 right-6 z-20 animate-in-stagger-1">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleLanguage}
          className="glass-premium hover:glass-gold transition-all duration-500 rounded-2xl w-12 h-12 border-secondary/20 hover:border-secondary/50 hover:scale-110 group"
        >
          <Languages className="h-5 w-5 text-secondary group-hover:scale-110 transition-transform" />
        </Button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Container - Enhanced */}
        <div className="flex justify-center mb-10 sm:mb-12 animate-in-stagger-1">
          <div className="relative">
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-secondary/20 rounded-[3rem] blur-2xl scale-110 animate-pulse-glow" />
            <div className="glass-premium rounded-[3rem] p-10 sm:p-14 shadow-[var(--shadow-float)] hover:shadow-[var(--shadow-gold)] transition-all duration-700 hover:scale-[1.02] shimmer-overlay relative">
              <img 
                src={logo} 
                alt="Boulevard Café Logo" 
                className="w-60 sm:w-80 h-auto object-contain drop-shadow-2xl animate-float" 
              />
            </div>
          </div>
        </div>

        {/* Main Card - Enhanced glass effect */}
        <div className="glass-premium rounded-[3rem] shadow-[var(--shadow-float)] p-8 sm:p-12 space-y-8 animate-in-stagger-2 hover:shadow-[var(--shadow-gold)] transition-all duration-700 border-secondary/10">
          
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold gradient-text-gold tracking-wide uppercase">
              Boulevard Café Elbasan
            </h1>



            {/* Table number badge or identifier input */}
            {isGenericTable && tableNumber === t.table ? (
              <TableIdentifier
                language={language}
                tableNumber={tableNumber}
                isGeneric={isGenericTable}
                onUpdate={(val) => setTableNumber(val)}
              />
            ) : (
              <>
                <div className="inline-block badge-float">
                  <div className="px-10 py-4 rounded-full glass-gold border-2 border-secondary/40 shadow-[var(--shadow-gold)]">
                    <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                      {tableNumber}
                    </p>
                  </div>
                </div>
                {isGenericTable && (
                  <TableIdentifier
                    language={language}
                    tableNumber={tableNumber}
                    isGeneric={false}
                    onUpdate={(val) => setTableNumber(val)}
                  />
                )}
              </>
            )}

            <p className="text-lg sm:text-xl text-muted-foreground font-bold pt-2">
              {t.chooseService}
            </p>
          </div>

          {/* Action Buttons - Staggered animation & premium style */}
          <div className="space-y-4 pt-2">
            <Button 
              variant="waiter" 
              size="lg" 
              onClick={() => withGeoCheck(handleCallWaiter)} 
              disabled={checking}
              className="w-full h-[4.5rem] sm:h-20 text-xl sm:text-2xl font-display font-bold touch-manipulation service-btn animate-in-stagger-3 group"
            >
              <Bell className="mr-3 h-7 w-7 scale-bounce-hover" />
              {t.callWaiter}
            </Button>

            <Button 
              variant="bill" 
              size="lg" 
              onClick={() => withGeoCheck(handleRequestBill)} 
              disabled={checking}
              className="w-full h-[4.5rem] sm:h-20 text-xl sm:text-2xl font-display font-bold touch-manipulation service-btn animate-in-stagger-4 group"
            >
              <Receipt className="mr-3 h-7 w-7 scale-bounce-hover" />
              {t.requestBill}
            </Button>

            <Button 
              variant="burgundy" 
              size="lg" 
              onClick={() => withGeoCheck(async () => { navigate(`/menu?tabela=${tableNumber}`); })} 
              disabled={checking}
              className="w-full h-[4.5rem] sm:h-20 text-xl sm:text-2xl font-display font-bold touch-manipulation service-btn animate-in-stagger-5 group"
            >
              <UtensilsCrossed className="mr-3 h-7 w-7 group-hover:rotate-12 transition-transform duration-300" />
              {t.orderMenu}
            </Button>

            <Button 
              variant="gold" 
              size="lg" 
              onClick={() => setChatOpen(true)} 
              className="w-full h-[4.5rem] sm:h-20 text-xl sm:text-2xl font-display font-bold touch-manipulation service-btn animate-in-stagger-6 group"
            >
              <MessageCircle className="mr-3 h-7 w-7 scale-bounce-hover" />
              {t.askStaff}
            </Button>


          </div>

          {/* Social Media Links - Premium style */}
          <div className="pt-6 animate-in-stagger-6">
            <div className="flex justify-center gap-5">
              <a 
                href="https://www.facebook.com/Boulevard-CAFFE" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link-premium group"
              >
                <Facebook className="h-6 w-6 text-secondary group-hover:scale-110 transition-transform duration-300" />
              </a>
              <a 
                href="https://www.instagram.com/boulevard.cafe_el" 
                target="_blank" 
                rel="noopener noreferrer"
                className="social-link-premium group"
              >
                <Instagram className="h-6 w-6 text-secondary group-hover:scale-110 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer - Enhanced */}
        <div className="text-center mt-10 sm:mt-12 space-y-1 animate-in-stagger-6">
          <p className="text-base font-display font-semibold text-secondary/90 drop-shadow-lg">
            {t.footer}
          </p>
          <p className="text-sm text-muted-foreground/70 italic">
            {t.footerSub}
          </p>
          {/* Hidden manager login link - double tap on footer text */}
          <button 
            onClick={() => navigate('/manager-login')}
            className="mt-4 text-xs text-muted-foreground/40 hover:text-secondary/60 transition-colors"
          >
            •
          </button>
        </div>
      </div>

      <StaffChatDialog open={chatOpen} onOpenChange={setChatOpen} />
      
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
