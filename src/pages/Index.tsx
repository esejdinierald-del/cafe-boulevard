import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Receipt, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/universal-caffe-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link } from "react-router-dom";
const Index = () => {
  const [searchParams] = useSearchParams();
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
      } = await supabase.from('service_requests').insert({
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
      } = await supabase.from('service_requests').insert({
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
      {/* Animated Coffee Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,25%,96%)] via-[hsl(25,40%,92%)] to-[hsl(25,50%,88%)] animate-gradient" />
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--foreground)) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      
      {/* Dashboard Link for Staff */}
      <Link to="/dashboard" className="fixed top-4 right-4 z-50">
        <Button variant="ghost" size="icon" className="rounded-full bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300">
          <LayoutDashboard className="h-5 w-5" />
        </Button>
      </Link>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Container */}
        <div className="flex justify-center mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="glass-effect rounded-3xl sm:rounded-[2rem] p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] transition-all duration-500 hover:scale-105">
            <img src={logo} alt="Universal Caffè Logo" className="w-48 sm:w-64 h-auto object-contain drop-shadow-2xl" />
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-effect rounded-3xl sm:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-6 sm:p-10 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] transition-all duration-500">
          {/* Welcome Text */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent mb-3 tracking-tight">
              Mirë se vini
            </h1>
            <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
              <p className="text-xl sm:text-2xl font-semibold text-foreground">
                {tableNumber}
              </p>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-4">
              Zgjidhni shërbimin që dëshironi
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-2">
            <Button 
              variant="waiter" 
              size="lg" 
              onClick={handleCallWaiter} 
              className="w-full h-16 sm:h-18 text-lg sm:text-xl font-bold touch-manipulation group"
            >
              <Bell className="mr-3 h-6 w-6 group-hover:animate-jiggle" />
              Thirr Kamarieren
            </Button>

            <Button 
              variant="bill" 
              size="lg" 
              onClick={handleRequestBill} 
              className="w-full h-16 sm:h-18 text-lg sm:text-xl font-bold touch-manipulation group"
            >
              <Receipt className="mr-3 h-6 w-6 group-hover:animate-shimmer" />
              Kërko Faturën
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex justify-center gap-2 flex-wrap pt-2">
            <span className="px-4 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
              Shërbim i Shpejtë
            </span>
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
              24/7 Disponibël
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 animate-in fade-in duration-1000 delay-300">
          <p className="text-sm text-muted-foreground font-medium drop-shadow-sm">
            Universal Caffè - Shërbim i shkëlqyer për ju
          </p>
        </div>
      </div>
    </div>;
};
export default Index;