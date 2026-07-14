import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, Plus, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/boulevard-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // If already installed (standalone mode), redirect to home
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      navigate("/", { replace: true });
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Detect Android
    const isAndroidDevice = /Android/.test(navigator.userAgent);
    setIsAndroid(isAndroidDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [navigate]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6 flex flex-col items-center justify-center">
      <Card className="w-full max-w-md p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <img src={logo} alt="Boulevard Café" className="w-32 h-auto" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Instalo Aplikacionin</h1>
          <p className="text-muted-foreground">
            Shto Boulevard Café në ekranin tënd kryesor për qasje të shpejtë
          </p>
        </div>

        {isInstalled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-success">
              <Check className="h-6 w-6" />
              <span className="font-semibold">Aplikacioni është i instaluar!</span>
            </div>
            <Button onClick={() => navigate("/")} className="w-full" size="lg">
              Hap Aplikacionin
            </Button>
          </div>
        ) : deferredPrompt ? (
          <Button onClick={handleInstallClick} className="w-full gap-2" size="lg">
            <Download className="h-5 w-5" />
            Instalo Tani
          </Button>
        ) : isIOS ? (
          <div className="space-y-4 text-left">
            <p className="font-semibold text-center">Si të instaloni në iPhone/iPad:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Share className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">1. Kliko ikonën Share</p>
                  <p className="text-sm text-muted-foreground">Në fund të Safari browser</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">2. Zgjidh "Add to Home Screen"</p>
                  <p className="text-sm text-muted-foreground">Shfaqet në listën e opsioneve</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">3. Kliko "Add"</p>
                  <p className="text-sm text-muted-foreground">Aplikacioni do të shfaqet në ekran</p>
                </div>
              </div>
            </div>
          </div>
        ) : isAndroid ? (
          <div className="space-y-4 text-left">
            <p className="font-semibold text-center">Si të instaloni në Android:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <MoreVertical className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">1. Kliko menynë (⋮)</p>
                  <p className="text-sm text-muted-foreground">Në këndin e sipërm djathtas të Chrome</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">2. Zgjidh "Install app" ose "Add to Home screen"</p>
                  <p className="text-sm text-muted-foreground">Shfaqet në listën e opsioneve</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">3. Konfirmo instalimin</p>
                  <p className="text-sm text-muted-foreground">Aplikacioni do të shfaqet në ekran</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Hap këtë faqe në celularin tënd për të instaluar aplikacionin
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-mono text-sm break-all">boulevard-caffe.lovable.app/install</p>
            </div>
          </div>
        )}

        <Button variant="outline" onClick={() => navigate("/")} className="w-full">
          Kthehu te Faqja Kryesore
        </Button>
      </Card>
    </div>
  );
};

export default Install;
