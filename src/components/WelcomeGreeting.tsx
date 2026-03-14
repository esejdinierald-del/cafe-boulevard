import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeGreetingProps {
  language: "sq" | "en";
  onDismiss: () => void;
  onOpenChat: () => void;
}

const greetings = {
  sq: {
    title: "Përshëndetje! 👋",
    message: "Mirë se vini në Boulevard Café! Unë jam asistenti juaj virtual. Si mund t'ju ndihmoj sot?",
    tip: "Mund të më pyesni për menunë, ofertat speciale, ose çdo gjë tjetër!",
    askButton: "Fol me mua",
    closeButton: "Faleminderit"
  },
  en: {
    title: "Hello! 👋",
    message: "Welcome to Boulevard Café! I'm your virtual assistant. How can I help you today?",
    tip: "Feel free to ask me about the menu, special offers, or anything else!",
    askButton: "Chat with me",
    closeButton: "Thank you"
  }
};

export const WelcomeGreeting = ({ language, onDismiss, onOpenChat }: WelcomeGreetingProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const t = greetings[language];

  useEffect(() => {
    // Delay the appearance for a smoother experience
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    // Auto-dismiss after 10 seconds
    const hideTimer = setTimeout(() => {
      handleDismiss();
    }, 12000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 500);
  };

  const handleOpenChat = () => {
    handleDismiss();
    setTimeout(() => {
      onOpenChat();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 transition-all duration-500 ${
        isLeaving 
          ? "opacity-0 translate-y-8 scale-95" 
          : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      <div className="glass-premium rounded-3xl p-5 shadow-[var(--shadow-gold)] border border-secondary/30 relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-accent to-secondary" />
        
        {/* Close button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Avatar */}
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-lg animate-pulse-glow">
              <MessageCircle className="w-6 h-6 text-background" />
            </div>
          </div>
          
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-display font-bold text-foreground">
              {t.title}
            </h3>
            <p className="text-sm font-medium text-foreground/90 leading-relaxed">
              {t.message}
            </p>
            <p className="text-xs font-medium text-muted-foreground italic">
              {t.tip}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="gold"
            size="sm"
            onClick={handleOpenChat}
            className="flex-1 font-display font-semibold"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t.askButton}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="glass-premium border-secondary/20 hover:border-secondary/40 font-display"
          >
            {t.closeButton}
          </Button>
        </div>

        {/* Typing indicator animation */}
        <div className="absolute bottom-2 left-5 flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-secondary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-secondary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
};
