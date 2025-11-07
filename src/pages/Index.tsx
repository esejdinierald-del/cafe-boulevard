import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Receipt, UtensilsCrossed, Facebook, Instagram, Languages } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/art-coffee-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";

const translations = {
  sq: {
    welcome: "Mirë se vini",
    table: "Tavolinë",
    chooseService: "Zgjidhni shërbimin që dëshironi",
    callWaiter: "Thirr Kamarieren",
    requestBill: "Kërko Faturën",
    orderMenu: "Porosit nga Menu",
    premium: "Premium Service",
    fast: "Fast & Elegant",
    footer: "Art Coffee - Where elegance meets excellence",
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
    premium: "Premium Service",
    fast: "Fast & Elegant",
    footer: "Art Coffee - Where elegance meets excellence",
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
      const {
        error
      } = await (supabase as any).from('service_requests').insert({
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
      const {
        error
      } = await (supabase as any).from('service_requests').insert({
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
      {/* Coffee Background Image */}
      <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url(${coffeeBackground})`
      }} />
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-[1px]" />

      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleLanguage}
          className="glass-premium hover:glass-gold transition-all duration-300 rounded-2xl"
        >
          <Languages className="h-5 w-5" />
        </Button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Container */}
        <div className="flex justify-center mb-8 sm:mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="glass-premium rounded-[2.5rem] p-8 sm:p-12 shadow-[var(--shadow-float)] hover:shadow-[var(--shadow-gold)] transition-all duration-700 hover:scale-105 animate-float">
            <img src={logo} alt="Art Coffee Logo" className="w-56 sm:w-72 h-auto object-contain drop-shadow-2xl" />
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-premium rounded-[2.5rem] shadow-[var(--shadow-float)] p-8 sm:p-12 space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 hover:shadow-[var(--shadow-gold)] transition-all duration-700">
          {/* Welcome Text */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl sm:text-6xl font-display font-bold gradient-text-gold mb-4 tracking-tight">
              {t.welcome}
            </h1>
            <div className="inline-block px-8 py-3 rounded-full glass-gold border-2 border-secondary/30 animate-pulse-glow">
              <p className="text-2xl sm:text-3xl font-display font-semibold text-foreground">
                {tableNumber}
              </p>
            </div>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 font-medium">
              {t.chooseService}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-5 pt-4">
            <Button variant="waiter" size="lg" onClick={handleCallWaiter} className="w-full h-20 sm:h-22 text-xl sm:text-2xl font-display font-bold touch-manipulation group">
              <Bell className="mr-3 h-7 w-7 group-hover:animate-jiggle" />
              {t.callWaiter}
            </Button>

            <Button variant="bill" size="lg" onClick={handleRequestBill} className="w-full h-20 sm:h-22 text-xl sm:text-2xl font-display font-bold touch-manipulation group">
              <Receipt className="mr-3 h-7 w-7 group-hover:animate-shimmer" />
              {t.requestBill}
            </Button>

            <Button 
              variant="burgundy" 
              size="lg" 
              onClick={() => navigate(`/menu?tabela=${tableNumber}`)} 
              className="w-full h-20 sm:h-22 text-xl sm:text-2xl font-display font-bold touch-manipulation group"
            >
              <UtensilsCrossed className="mr-3 h-7 w-7 group-hover:rotate-12 transition-transform" />
              {t.orderMenu}
            </Button>
          </div>

          {/* Social Media Links */}
          <div className="pt-4">
            <div className="flex justify-center gap-4">
              <a 
                href="https://www.facebook.com/artcaffee" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 rounded-full glass-premium hover:glass-gold transition-all duration-300 hover:scale-110"
              >
                <Facebook className="h-6 w-6 text-secondary" />
              </a>
              <a 
                href="https://www.instagram.com/artcaffee" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 rounded-full glass-premium hover:glass-gold transition-all duration-300 hover:scale-110"
              >
                <Instagram className="h-6 w-6 text-secondary" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-10 animate-in fade-in duration-1000 delay-300">
          <p className="text-sm text-muted-foreground font-medium drop-shadow-lg">
            {t.footer}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
