import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Receipt, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/boulevard-logo.png";
import coffeeBackground from "@/assets/coffee-background.png";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tableNumber, setTableNumber] = useState("Tavolinë");
  useEffect(() => {
    const tableParam = searchParams.get("tabela") || searchParams.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
    }
  }, [searchParams]);
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
      toast.success("Thirrja u dërgua!", {
        description: "Kamarieri do të vijë së shpejti në tavolinën tuaj.",
        duration: 4000
      });
    } catch (error) {
      console.error('Error calling waiter:', error);
      toast.error("Gabim në dërgimin e thirrjes");
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
      toast.success("Kërkesa u dërgua!", {
        description: "Fatura do të përgatitet për ju.",
        duration: 4000
      });
    } catch (error) {
      console.error('Error requesting bill:', error);
      toast.error("Gabim në dërgimin e kërkesës");
    }
  };
  return <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4 sm:p-6">
      {/* Coffee Background Image */}
      <div className="absolute inset-0 bg-cover bg-center" style={{
      backgroundImage: `url(${coffeeBackground})`
    }} />
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-[1px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Container */}
        <div className="flex justify-center mb-8 sm:mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="glass-premium rounded-[2.5rem] p-8 sm:p-12 shadow-[var(--shadow-float)] hover:shadow-[var(--shadow-gold)] transition-all duration-700 hover:scale-105 animate-float">
            <img src={logo} alt="Boulevard Café Logo" className="w-56 sm:w-72 h-auto object-contain drop-shadow-2xl" />
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-premium rounded-[2.5rem] shadow-[var(--shadow-float)] p-8 sm:p-12 space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 hover:shadow-[var(--shadow-gold)] transition-all duration-700">
          {/* Welcome Text */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl sm:text-6xl font-display font-bold gradient-text-gold mb-4 tracking-tight">
              Mirë se vini
            </h1>
            <div className="inline-block px-8 py-3 rounded-full glass-gold border-2 border-secondary/30 animate-pulse-glow">
              <p className="text-2xl sm:text-3xl font-display font-semibold text-foreground">
                {tableNumber}
              </p>
            </div>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 font-medium">
              Zgjidhni shërbimin që dëshironi
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-5 pt-4">
            <Button variant="waiter" size="lg" onClick={handleCallWaiter} className="w-full h-20 sm:h-22 text-xl sm:text-2xl font-display font-bold touch-manipulation group">
              <Bell className="mr-3 h-7 w-7 group-hover:animate-jiggle" />
              Thirr Kamarieren
            </Button>

            <Button variant="bill" size="lg" onClick={handleRequestBill} className="w-full h-20 sm:h-22 text-xl sm:text-2xl font-display font-bold touch-manipulation group">
              <Receipt className="mr-3 h-7 w-7 group-hover:animate-shimmer" />
              Kërko Faturën
            </Button>

            <Button 
              variant="burgundy" 
              size="lg" 
              onClick={() => navigate(`/menu?tabela=${tableNumber}`)} 
              className="w-full h-20 sm:h-22 text-xl sm:text-2xl font-display font-bold touch-manipulation group"
            >
              <UtensilsCrossed className="mr-3 h-7 w-7 group-hover:rotate-12 transition-transform" />
              Porosit nga Menu
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex justify-center gap-3 flex-wrap pt-4">
            <span className="px-5 py-2 rounded-full glass-gold text-secondary text-sm font-bold border border-secondary/30">
              Premium Service
            </span>
            <span className="px-5 py-2 rounded-full bg-success/10 text-success text-sm font-bold border border-success/20">
              Fast & Elegant
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-10 animate-in fade-in duration-1000 delay-300">
          <p className="text-sm text-muted-foreground font-medium drop-shadow-lg">
            Boulevard Café - Where elegance meets excellence
          </p>
        </div>
      </div>
    </div>;
};
export default Index;