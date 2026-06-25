import { useState, useEffect } from "react";
import { StaffChatDialog } from "@/components/StaffChatDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { WelcomeGreeting } from "@/components/WelcomeGreeting";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Languages } from "lucide-react";
import boulevardLogo from "@/assets/boulevard-logo.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  LocationPinIcon,
  BellIcon,
  ReceiptIcon,
  UtensilsIcon,
  ChatIcon,
  StarIcon,
  CheckIcon,
} from "@/components/icons";
import "@/styles/boulevard.css";

const STAFF_PWA_PREFERRED_KEY = "staff_pwa_preferred";

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

const shouldRedirectToStaff = () =>
  isStandaloneMode() &&
  (Boolean(localStorage.getItem("staff_shift_token")) ||
    localStorage.getItem(STAFF_PWA_PREFERRED_KEY) === "1");

const translations = {
  sq: {
    table: "Tavolinë",
    tableLabel: "Nr. Tavolinës",
    chooseService: "Mirë se erdhët! Si mund t'ju ndihmojmë?",
    callWaiter: "Thirr Kamerieren",
    requestBill: "Kërko Faturën",
    orderMenu: "Porosit nga Menu",
    askStaff: "Pyet Stafin",
    rateUs: "Na Vlerëso",
    requestSong: "Kërko Këngë",
    enterSongLink: "Ngjit linkun e YouTube...",
    sendSong: "Dërgo Këngën",
    cancel: "Anulo",
    sending: "Duke dërguar...",
    songSent: "Kërkesa u dërgua!",
    songSentDesc: "Kamarieri do ta miratojë para se të luhet.",
    songError: "Gabim në dërgimin e kërkesës",
    songUrlRequired: "Vendos linkun e YouTube",
    successWaiter: "Thirrja u dërgua!",
    successWaiterDesc: "Kamarieri do të vijë së shpejti në tavolinën tuaj.",
    successBill: "Kërkesa u dërgua!",
    successBillDesc: "Fatura do të përgatitet për ju.",
    error: "Gabim në dërgimin e kërkesës",
    errorWaiter: "Gabim në dërgimin e thirrjes",
    tableRequired: "Shkruani numrin e tavolinës",
    subtitle: "Café Elbasan · Eat · Drink · Connect",
  },
  en: {
    table: "Table",
    tableLabel: "Table Nr.",
    chooseService: "Welcome! How can we help you?",
    callWaiter: "Call Waiter",
    requestBill: "Request Bill",
    orderMenu: "Order from Menu",
    askStaff: "Ask Staff",
    rateUs: "Rate Us",
    requestSong: "Request Song",
    enterSongLink: "Paste YouTube link...",
    sendSong: "Send Song",
    cancel: "Cancel",
    sending: "Sending...",
    songSent: "Request sent!",
    songSentDesc: "The waiter will approve it before playing.",
    songError: "Error sending request",
    songUrlRequired: "Enter the YouTube link",
    successWaiter: "Call sent!",
    successWaiterDesc: "The waiter will arrive at your table shortly.",
    successBill: "Request sent!",
    successBillDesc: "The bill will be prepared for you.",
    error: "Error sending request",
    errorWaiter: "Error sending call",
    tableRequired: "Enter the table number",
    subtitle: "Café Elbasan · Eat · Drink · Connect",
  },
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const t = translations[language];

  // CRITICAL: Check staff redirect SYNCHRONOUSLY before any render
  // This prevents the flash of the client UI when staff PWA opens at "/"
  const [redirecting] = useState(() => {
    if (shouldRedirectToStaff()) {
      window.location.replace("/staff");
      return true;
    }
    return false;
  });

  const tableParam = searchParams.get("tabela") || searchParams.get("table");
  const [tableNumber, setTableNumber] = useState(tableParam || "");
  const [chatOpen, setChatOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [pendingAction, setPendingAction] = useState<null | "waiter" | "bill">(null);
  const [tableInput, setTableInput] = useState("");
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [songUrl, setSongUrl] = useState("");
  const [submittingSong, setSubmittingSong] = useState(false);
  const [tableDisplayName, setTableDisplayName] = useState("");
  const { checking } = useGeolocation();

  useEffect(() => {
    if (tableParam) setTableNumber(tableParam);
  }, [tableParam]);

  useEffect(() => {
    const n = tableNumber.trim();
    if (!n) {
      setTableDisplayName("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-table-name", {
          body: { table_number: n },
        });
        if (!cancelled) setTableDisplayName(data?.name || `Tavolina ${n}`);
      } catch {
        if (!cancelled) setTableDisplayName(`Tavolina ${n}`);
      }
    })();
    return () => { cancelled = true; };
  }, [tableNumber]);

  // Don't render anything while redirecting to staff
  if (redirecting) {
    return <div className="min-h-screen bg-foreground" />;
  }

  const displayTable = tableDisplayName || tableNumber || t.table;

  const submitWaiter = async () => {
    try {
      const val = tableNumber.trim();
      if (!val) {
        toast.error(t.tableRequired);
        return;
      }
      const { error } = await supabase.from("service_requests").insert({
        table_number: val,
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

  const submitBill = async () => {
    try {
      const val = tableNumber.trim();
      if (!val) {
        toast.error(t.tableRequired);
        return;
      }
      const { error } = await supabase.from("service_requests").insert({
        table_number: val,
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

  const handleCallWaiter = () => {
    if (!tableNumber.trim()) {
      setTableInput("");
      setPendingAction("waiter");
      return;
    }
    submitWaiter();
  };

  const handleRequestBill = () => {
    if (!tableNumber.trim()) {
      setTableInput("");
      setPendingAction("bill");
      return;
    }
    submitBill();
  };

  const handleRequestSong = async () => {
    if (!tableNumber.trim()) {
      toast.error(t.tableRequired);
      return;
    }
    if (!songUrl.trim()) {
      toast.error(t.songUrlRequired);
      return;
    }
    setSubmittingSong(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-songs", {
        body: {
          action: "request",
          table_number: tableNumber.trim(),
          url: songUrl.trim(),
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || t.songError);
        return;
      }
      toast.success(t.songSent, { description: t.songSentDesc });
      setSongDialogOpen(false);
      setSongUrl("");
    } catch {
      toast.error(t.songError);
    } finally {
      setSubmittingSong(false);
    }
  };

  const confirmTableAndRun = () => {
    const v = tableInput.trim();
    if (!v) {
      toast.error(t.tableRequired);
      return;
    }
    setTableNumber(v);
    const action = pendingAction;
    setPendingAction(null);
    setTimeout(() => {
      if (action === "waiter") submitWaiter();
      else if (action === "bill") submitBill();
    }, 0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background layers */}
      <div className="blvd-ambient" />
      <div className="blvd-bokeh-blur" />
      <div className="blvd-sparkles" />
      <div className="blvd-vignette" />

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={toggleLanguage} className="blvd-lang-btn">
          <Languages className="h-5 w-5" />
        </button>
      </div>

      {/* ═══ PHONE MOCKUP ═══ */}
      <div className="blvd-phone">
        <div className="blvd-phone-highlight" />
        <div className="blvd-phone-shadow" />

        {/* Screen */}
        <div className="blvd-screen">
          <div className="blvd-glass-reflect" />

          {/* Content */}
          <div className="blvd-screen-content">
            <div className="blvd-noise" />
            <div className="blvd-light-ray" />
            <div className="blvd-inner-vignette" />

            {/* ═══ HEADER ═══ */}
            <div className="blvd-header">
              <div className="blvd-header-vignette" />
              <div className="blvd-header-line-top" />
              <div className="blvd-header-line-bottom" />

              <div className="relative z-10">
                <img
                  src={boulevardLogo}
                  alt="Boulevard Café"
                  className="w-48 h-auto mx-auto mb-4 rounded-xl object-contain"
                  style={{
                    border: '1.5px solid rgba(232, 199, 109, 0.35)',
                    padding: '6px',
                    background: 'linear-gradient(135deg, rgba(10,12,16,0.9), rgba(5,5,8,0.95))',
                    filter: 'drop-shadow(0 0 16px rgba(232, 199, 109, 0.35)) drop-shadow(0 0 35px rgba(255, 180, 50, 0.15))',
                  }}
                />
                <h1 className="blvd-title">BOULEVARD</h1>
                <div className="blvd-title-underline" />
                <p className="blvd-subtitle">{t.subtitle}</p>
              </div>
            </div>

            {/* Golden flare separator */}
            <div className="w-full h-[2px] my-2" style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,200,80,0.8) 30%, rgba(255,240,180,1) 50%, rgba(255,200,80,0.8) 70%, transparent)',
              boxShadow: '0 0 15px rgba(255,180,50,0.6), 0 0 40px rgba(255,150,30,0.3), 0 0 80px rgba(255,130,20,0.15)',
            }} />

            {/* Section title */}
            <h2 className="blvd-section-title">BOULEVARD CAFÉ ELBASAN</h2>

            {/* ═══ BUTTONS ═══ */}
            <div className="w-full flex flex-col gap-3 relative z-10">
              {/* Welcome text */}
              <p className="blvd-welcome">{t.chooseService}</p>

              {pendingAction && (
                <div className="blvd-table-row">
                  <div className="pl-5 flex-shrink-0 relative z-10">
                    <LocationPinIcon />
                  </div>
                  <input
                    type="text"
                    placeholder={t.tableLabel}
                    value={tableInput}
                    onChange={(e) => setTableInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmTableAndRun()}
                    autoFocus
                    className="blvd-table-input"
                  />
                  <div className="pr-3 flex-shrink-0 relative z-10">
                    <button onClick={confirmTableAndRun} className="blvd-check-btn">
                      <CheckIcon />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Call Waiter — Dark */}
              <button onClick={handleCallWaiter} disabled={checking} className="blvd-btn-dark">
                <span className="blvd-icon-gold"><BellIcon /></span>
                <span>{t.callWaiter}</span>
              </button>

              {/* 3. Request Bill — GOLD */}
              <button onClick={handleRequestBill} disabled={checking} className="blvd-btn-gold">
                <span className="blvd-shimmer" />
                <span className="blvd-icon-dark"><ReceiptIcon /></span>
                <span className="relative z-10">{t.requestBill}</span>
              </button>

              {/* 4. Order from Menu — Dark */}
              <button onClick={() => navigate(`/menu?tabela=${tableNumber.trim() || ""}`)} className="blvd-btn-dark">
                <span className="blvd-icon-gold"><UtensilsIcon /></span>
                <span>{t.orderMenu}</span>
              </button>

              {/* 5. Ask Staff — GOLD */}
              <button onClick={() => setChatOpen(true)} className="blvd-btn-gold">
                <span className="blvd-shimmer" style={{ animationDelay: '2s' }} />
                <span className="blvd-icon-dark"><ChatIcon /></span>
                <span className="relative z-10">{t.askStaff}</span>
              </button>

              {/* Request Song — Dark */}
              <button onClick={() => setSongDialogOpen(true)} className="blvd-btn-dark">
                <span className="blvd-icon-gold text-xl">🎵</span>
                <span>{t.requestSong}</span>
              </button>

              {/* 6. Rate Us — Dark */}
              <button onClick={() => setFeedbackOpen(true)} className="blvd-btn-dark">
                <span className="blvd-icon-gold"><StarIcon /></span>
                <span>{t.rateUs}</span>
              </button>
            </div>

            {/* Hidden manager link */}
            <button onClick={() => navigate("/manager-login")} className="blvd-manager-dot">•</button>
          </div>
        </div>
      </div>

      <StaffChatDialog open={chatOpen} onOpenChange={setChatOpen} />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} tableNumber={displayTable} language={language} />

      <Dialog open={songDialogOpen} onOpenChange={setSongDialogOpen}>
        <DialogContent className="bg-[#0a0c10] border border-[rgba(232,199,109,0.35)] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span>🎵</span> {t.requestSong}
            </DialogTitle>
            <p className="text-sm text-white/70 mt-1">{t.enterSongLink}</p>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <Input
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="h-12 rounded-xl bg-black/40 border-[rgba(232,199,109,0.35)] text-white placeholder:text-white/40"
              onKeyDown={(e) => e.key === "Enter" && !submittingSong && handleRequestSong()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleRequestSong}
                disabled={submittingSong}
                className="blvd-btn-gold flex-1 h-12"
              >
                <span className="relative z-10">
                  {submittingSong ? t.sending : t.sendSong}
                </span>
              </button>
              <button
                onClick={() => setSongDialogOpen(false)}
                className="blvd-btn-dark h-12 px-6"
              >
                <span>{t.cancel}</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
