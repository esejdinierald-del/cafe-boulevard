import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Receipt } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/universal-caffe-logo.png";

const Index = () => {
  const [tableNumber] = useState("Tavolinë");

  const handleCallWaiter = () => {
    toast.success("Thirrja u dërgua!", {
      description: "Kamarieri do të vijë së shpejti në tavolinën tuaj.",
      duration: 4000,
    });
  };

  const handleRequestBill = () => {
    toast.success("Kërkesa u dërgua!", {
      description: "Fatura do të përgatitet për ju.",
      duration: 4000,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo Container */}
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-card rounded-3xl p-8 shadow-2xl">
            <img 
              src={logo} 
              alt="Universal Caffè Logo" 
              className="w-64 h-auto object-contain"
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-card rounded-3xl shadow-2xl p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          {/* Welcome Text */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Mirë se vini
            </h1>
            <p className="text-xl text-muted-foreground font-medium">
              {tableNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              Zgjidhni shërbimin që dëshironi
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <Button
              variant="waiter"
              size="lg"
              onClick={handleCallWaiter}
              className="w-full h-16 text-lg font-semibold"
            >
              <Bell className="mr-2 h-5 w-5" />
              Thirr Kamarieren
            </Button>

            <Button
              variant="bill"
              size="lg"
              onClick={handleRequestBill}
              className="w-full h-16 text-lg font-semibold"
            >
              <Receipt className="mr-2 h-5 w-5" />
              Kërko Faturën
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 animate-in fade-in duration-1000 delay-300">
          <p className="text-sm text-muted-foreground">
            Universal Caffè - Shërbim i shkëlqyer për ju
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
