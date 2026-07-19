import { useEffect, useState, useRef, useCallback, TouchEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, Volume2, Clock, AlertTriangle, CheckCircle2, Loader2, RefreshCw, QrCode, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import QrScanner from "@/components/QrScanner";
import SplashScreen from "@/components/SplashScreen";
import boulevardLogo from "@/assets/boulevard-logo.png";
import { StaffPinLogin } from "@/components/staff/StaffPinLogin";
import { RomeClock } from "@/components/RomeClock";
import { romeDateISO, isPastShiftDay } from "@/lib/rome-time";

interface ServiceRequest {
  id: string;
  table_number: string;
  request_type: string;
  status: string;
  created_at: string;
}

interface Order {
  id: string;
  table_number: string;
  items: Array<{ name: string; quantity: number }>;
  total_price: number;
  status: string;
  created_at: string;
  notes: string | null;
}

const getElapsedMinutes = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return Math.floor(diff / 60000);
};

const ElapsedBadge = ({ createdAt }: { createdAt: string }) => {
  const [mins, setMins] = useState(getElapsedMinutes(createdAt));
  useEffect(() => {
    const interval = setInterval(() => setMins(getElapsedMinutes(createdAt)), 15000);
    return () => clearInterval(interval);
  }, [createdAt]);
  const color = mins >= 5 ? "bg-destructive/20 text-destructive" : mins >= 2 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground";
  return <Badge className={`${color} text-[10px] font-medium`}>{mins} min</Badge>;
};

const STAFF_PWA_PREFERRED_KEY = "staff_pwa_preferred";

// VAPID public key for Web Push subscription
const VAPID_PUBLIC_KEY = "BPpV_rvXQJ90Ri_qDYBc9810BNa3r1_aT0LPJL7XK05DoadCXckfcOeXeUnB66a3J4TGkm-yWf1RhIPSeKYfJDc";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const StaffShift = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlToken = searchParams.get("token");

  // Try saved token from localStorage, fallback to URL token
  const [activeToken, setActiveToken] = useState<string | null>(() => {
    const saved = localStorage.getItem("staff_shift_token");
    const token = urlToken || saved || null;
    // Backfill shift-start date for sessions that predate this feature.
    if (token && !localStorage.getItem("staff_shift_started_date")) {
      localStorage.setItem("staff_shift_started_date", romeDateISO());
    }
    return token;
  });
  // Counter to force re-validation even when token doesn't change
  const [validateTrigger, setValidateTrigger] = useState(0);

  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [shiftEnd, setShiftEnd] = useState<Date | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [showScanner, setShowScanner] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // Skip splash when arriving with a token (QR scan link)
    if (urlToken) return false;
    const shown = sessionStorage.getItem("staff_splash_shown");
    return !shown;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(() => localStorage.getItem("staff_name"));
  const audioContextRef = useRef<AudioContext | null>(null);
  const touchStartY = useRef(0);
  const bypassTapsRef = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });

  const handleAdminBypass = useCallback(async () => {
    const pw = window.prompt("Fjalëkalimi i Admin-it për të kaluar QR-në:");
    if (!pw) return;
    try {
      const { data, error } = await supabase.functions.invoke("manage-shift", {
        body: { action: "admin_bypass", adminPassword: pw },
      });
      if (error || (data as any)?.error || !(data as any)?.token) {
        toast.error((data as any)?.error || "Fjalëkalim i pasaktë");
        return;
      }
      const newToken = (data as any).token as string;
      localStorage.setItem("staff_shift_token", newToken);
      if (!localStorage.getItem("staff_shift_started_date")) {
        localStorage.setItem("staff_shift_started_date", romeDateISO());
      }
      setActiveToken(newToken);
      setValidateTrigger(t => t + 1);
      toast.success("✅ QR u anashkalua nga admin-i");
    } catch {
      toast.error("Gabim në verifikim");
    }
  }, []);

  const handleLogoTap = useCallback(() => {
    const ref = bypassTapsRef.current;
    ref.count += 1;
    if (ref.timer) window.clearTimeout(ref.timer);
    if (ref.count >= 5) {
      ref.count = 0;
      handleAdminBypass();
      return;
    }
    ref.timer = window.setTimeout(() => { ref.count = 0; }, 1500);
  }, [handleAdminBypass]);

  useEffect(() => {
    // Only mark this device as a staff PWA when explicitly opened via ?app=ios
    // (e.g. from /install-staff or the staff manifest start_url).
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("app") === "ios") {
      localStorage.setItem(STAFF_PWA_PREFERRED_KEY, "1");
    }
  }, []);

  // Override manifest for staff PWA install — must happen ASAP
  useEffect(() => {
    // Remove existing manifest and create a fresh one pointing to staff
    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.remove();
    }
    const staffLink = document.createElement('link');
    staffLink.rel = 'manifest';
    staffLink.href = '/staff-manifest.webmanifest';
    document.head.appendChild(staffLink);

    return () => {
      staffLink.remove();
      // Restore client manifest
      const clientLink = document.createElement('link');
      clientLink.rel = 'manifest';
      clientLink.href = '/manifest.webmanifest';
      document.head.appendChild(clientLink);
    };
  }, []);

  // When URL has token, save it and clean URL
  useEffect(() => {
    if (urlToken) {
      setActiveToken(urlToken);
      localStorage.setItem("staff_shift_token", urlToken);
      // Anchor the shift-day (Rome timezone) — used to require admin
      // passcode when exiting past 23:59 of the day the shift started.
      if (!localStorage.getItem("staff_shift_started_date")) {
        localStorage.setItem("staff_shift_started_date", romeDateISO());
      }
      setValidateTrigger(t => t + 1); // ensure validation fires
      // Skip splash when arriving via QR link
      if (showSplash) {
        setShowSplash(false);
        sessionStorage.setItem("staff_splash_shown", "1");
      }
      // Clean URL
      setSearchParams({}, { replace: true });
    }
  }, [urlToken, setSearchParams]);

  // Validate token via edge function (shift_tokens no longer publicly readable)
  useEffect(() => {
    if (!activeToken) { setIsValid(false); return; }
    let cancelled = false;
    const validate = async (retries = 2) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke("validate-shift", {
            body: { token: activeToken },
          });
          if (cancelled) return;
          if (error || !data?.valid) {
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            setIsValid(false);
            localStorage.removeItem("staff_shift_token");
            return;
          }
          setIsValid(true);
          setShiftEnd(new Date(data.shift_end));
          return;
        } catch {
          if (cancelled) return;
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          setIsValid(false);
          localStorage.removeItem("staff_shift_token");
        }
      }
    };
    validate();
    return () => { cancelled = true; };
  }, [activeToken, validateTrigger]);

  // Countdown timer — checks every 10s, plus re-validates with server every 5 min
  useEffect(() => {
    if (!shiftEnd) return;
    let serverCheckCounter = 0;

    const expireShift = () => {
      setIsValid(false);
      setActiveToken(null);
      localStorage.removeItem("staff_shift_token");
      setTimeLeft("Turni ka mbaruar");
      toast.info("⏰ Turni ka përfunduar. Nuk do të merrni më thirrje.");
    };

    const update = () => {
      const diff = shiftEnd.getTime() - Date.now();
      if (diff <= 0) {
        expireShift();
        return false;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
      return true;
    };

    const serverRevalidate = async () => {
      if (!activeToken) return;
      try {
        const { data } = await supabase.functions.invoke("validate-shift", {
          body: { token: activeToken },
        });
        if (!data?.valid) {
          expireShift();
        }
      } catch {}
    };

    update();
    const interval = setInterval(() => {
      if (!update()) { clearInterval(interval); return; }
      // Re-validate with server every ~5 minutes (30 ticks × 10s)
      serverCheckCounter++;
      if (serverCheckCounter >= 30) {
        serverCheckCounter = 0;
        serverRevalidate();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [shiftEnd, activeToken]);

  // Play the loud alarm WAV file — works better in background than AudioContext
  const playAlarmSound = useCallback(() => {
    try {
      // Create a fresh Audio element each time for reliable playback
      const audio = new Audio('/notification-alarm.wav');
      audio.volume = 1.0;
      audio.play().catch(() => {
        // Fallback to AudioContext if Audio element fails
        if (audioContextRef.current) {
          const ctx = audioContextRef.current;
          const now = ctx.currentTime;
          for (let i = 0; i < 6; i++) {
            const t = now + i * 0.3;
            const freq = i % 2 === 0 ? 1200 : 800;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            osc.type = "square";
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
          }
        }
      });
    } catch {}
  }, []);

  // Extra-loud kitchen alarm — plays alarm twice
  const playKitchenAlarm = useCallback(() => {
    playAlarmSound();
    setTimeout(() => playAlarmSound(), 3200);
  }, [playAlarmSound]);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  const showSystemNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png',
        tag: `staff-${Date.now()}`, requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
      } as NotificationOptions);
      notification.onclick = () => { window.focus(); notification.close(); };
    }
  }, []);

  const triggerVibration = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }, []);

  const repeatNotification = useCallback((title: string, body: string, useKitchenAlarm = false) => {
    const sound = useKitchenAlarm ? playKitchenAlarm : playAlarmSound;
    const vibPattern = [500, 200, 500, 200, 500];
    sound(); showSystemNotification(title, body); if ('vibrate' in navigator) navigator.vibrate(vibPattern);
    const t1 = setTimeout(() => { sound(); showSystemNotification(title, body); if ('vibrate' in navigator) navigator.vibrate(vibPattern); }, 4000);
    const t2 = setTimeout(() => { sound(); showSystemNotification(title, body); if ('vibrate' in navigator) navigator.vibrate(vibPattern); }, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [playAlarmSound, playKitchenAlarm, showSystemNotification]);

  const enableAudio = useCallback(async () => {
    if (audioEnabled) return;
    try {
      // Initialize AudioContext as fallback
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      // Pre-load the alarm sound with a silent play to unlock audio on iOS
      const testAudio = new Audio('/notification-alarm.wav');
      testAudio.volume = 0.01;
      testAudio.play().then(() => { testAudio.pause(); testAudio.currentTime = 0; }).catch(() => {});
      const notifGranted = await requestNotificationPermission();
      setAudioEnabled(true);
      if (notifGranted) toast.success("🔊 Alarmi + Push njoftimet u aktivizuan!");
      else toast.success("🔊 Alarmi u aktivizua!");
      
      // Register service worker and subscribe to push notifications
      registerPushSubscription();
    } catch {}
  }, [audioEnabled, requestNotificationPermission]);

  // Register service worker and push subscription
  const registerPushSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register('/staff-sw.js', { scope: '/' });

      // Wait for SW to be ready
      const ready = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await ready.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      // Send subscription to backend
      const subJSON = subscription.toJSON();
      await supabase.functions.invoke('push-subscribe', {
        body: {
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth,
          shift_token: activeToken,
        },
      });
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  }, [activeToken]);

  const fetchData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    const token = activeToken || localStorage.getItem("staff_shift_token") || "";
    const [reqRes, ordRes] = await Promise.all([
      supabase.from("service_requests").select("*").eq("status", "pending").neq("request_type", "kitchen_ready").order("created_at", { ascending: true }),
      supabase.functions.invoke("list-orders", {
        body: { status: "pending", shiftToken: token },
        headers: { "x-shift-token": token },
      }),
    ]);
    if (reqRes.data) setRequests(reqRes.data as ServiceRequest[]);
    const ordData = (ordRes as any)?.data?.orders;
    if (Array.isArray(ordData)) setOrders(ordData as unknown as Order[]);
    if (showIndicator) setTimeout(() => setIsRefreshing(false), 300);
  }, [activeToken]);

  const handleCompleteRequest = useCallback(async (id: string, tableNumber: string) => {
    setCompletingIds(prev => new Set(prev).add(id));
    try {
      const { data, error } = await supabase.functions.invoke("complete-request", {
        body: { id, type: "service_request", shift_token: activeToken },
      });
      if (error || !data?.success) throw new Error("Failed");
      toast.success(`✅ ${tableNumber} — U krye!`);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch {
      toast.error("Gabim në përditësim");
    }
    setCompletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, [activeToken]);

  const handleDecideOrder = useCallback(async (id: string, tableNumber: string, decision: "accepted" | "rejected") => {
    if (decision === "rejected") {
      const adminName = window.prompt("Refuzimi kërkon admin.\nEmri i adminit:");
      if (!adminName || !adminName.trim()) return;
      const adminPassword = window.prompt(`Fjalëkalimi personal i adminit (${adminName.trim()}):`);
      if (!adminPassword) return;
      try {
        const { data, error } = await supabase.functions.invoke("verify-staff-admin", {
          body: { staffName: adminName.trim(), password: adminPassword },
        });
        if (error || !(data as any)?.valid) {
          toast.error((data as any)?.error || "Fjalëkalim i pasaktë ose nuk je admin");
          return;
        }
      } catch {
        toast.error("Gabim gjatë verifikimit të adminit");
        return;
      }
    }
    setCompletingIds(prev => new Set(prev).add(id));
    const token = activeToken || localStorage.getItem("staff_shift_token") || "";
    try {
      const { data, error } = await supabase.functions.invoke("update-order-status", {
        body: { id, status: decision, shiftToken: token },
        headers: { "x-shift-token": token },
      });
      if (error || !(data as any)?.success) throw new Error("Failed");
      toast.success(decision === "accepted"
        ? `✅ Porosia ${tableNumber} — u pranua`
        : `🚫 Porosia ${tableNumber} — u refuzua`);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch {
      toast.error("Gabim në përditësim");
    }
    setCompletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, [activeToken]);

  useEffect(() => {
    if (!isValid) return;
    fetchData();
    const pollId = setInterval(() => fetchData(), 4000);
    const channel = supabase
      .channel("staff-shift-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests" }, (payload) => {
        fetchData();
        const r = payload.new as any;
        if (r.request_type === "kitchen_ready") {
          repeatNotification(`🍽️ POROSIA GATI!`, `Klient në banakun — hajde merr!`, true);
          // Send push to other devices
          supabase.functions.invoke("send-push", {
            body: { title: "🍽️ POROSIA GATI!", body: "Klient në banakun — hajde merr!", type: "kitchen" },
            headers: activeToken ? { "x-shift-token": activeToken } : undefined,
          }).catch(() => {});
          setTimeout(async () => {
            await supabase.functions.invoke("complete-request", {
              body: { id: r.id, type: "service_request", shift_token: activeToken },
            });
          }, 15000);
        } else {
          const type = r.request_type === "waiter" ? "Kamarier" : "Faturë";
          repeatNotification(`🔔 ${type} - ${r.table_number}`, `Kërkesë e re nga ${r.table_number}`);
          // Send push to other devices
          supabase.functions.invoke("send-push", {
            body: { title: `🔔 ${type} - ${r.table_number}`, body: `Kërkesë e re nga ${r.table_number}`, type: "service" },
            headers: activeToken ? { "x-shift-token": activeToken } : undefined,
          }).catch(() => {});
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests" }, () => fetchData())
      .subscribe();
    return () => { clearInterval(pollId); supabase.removeChannel(channel); };
  }, [isValid, fetchData, repeatNotification]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const diff = e.changedTouches[0].clientY - touchStartY.current;
    if (diff > 80 && window.scrollY === 0) fetchData(true);
  }, [fetchData]);

  const handleQrScan = useCallback(async (scannedToken: string) => {
    setShowScanner(false);
    setActiveToken(scannedToken);
    localStorage.setItem("staff_shift_token", scannedToken);
    if (!localStorage.getItem("staff_shift_started_date")) {
      localStorage.setItem("staff_shift_started_date", romeDateISO());
    }
    setIsValid(null); // show loading
    setValidateTrigger(t => t + 1); // force re-validation even if same token

    // Unlock dashboard curtain via edge function — requires admin passcode server-side.
    const adminPassword = window.prompt(
      "QR u skanua. Për të zhbllokuar dashboard-in, shkruaj fjalëkalimin e adminit:",
    );
    if (!adminPassword) {
      toast.info("Zhbllokimi u anulua. Token-i i turnit u ruajt.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("unlock-shift", {
        body: { token: scannedToken, adminPassword },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const err = (data as any)?.error || error?.message;
      if (err) {
        toast.error("Zhbllokimi dështoi: " + err);
        return;
      }
    } catch (e) {
      console.error("Failed to unlock shift:", e);
      toast.error("Zhbllokimi dështoi.");
      return;
    }

    toast.success("QR u skanua! Dashboard u zhbllokua!");
  }, []);

  const handleEndShift = useCallback(async () => {
    const startedDate = localStorage.getItem("staff_shift_started_date");
    if (isPastShiftDay(startedDate)) {
      const pw = window.prompt(
        "Ora zyrtare (Rome/Tirana) ka kaluar 23:59 të ditës së turnit.\n" +
        "Për të mbyllur turnin duhet fjalëkalimi i adminit:",
      );
      if (!pw) return;
      const { data, error } = await supabase.functions.invoke("verify-admin-passcode", {
        body: { passcode: pw },
      });
      const err = (data as any)?.error || error?.message;
      if (!(data as any)?.valid) {
        toast.error(err || "Fjalëkalim i pasaktë");
        return;
      }
    }
    setActiveToken(null);
    setIsValid(false);
    localStorage.removeItem("staff_shift_token");
    localStorage.removeItem("staff_name");
    localStorage.removeItem("staff_role");
    localStorage.removeItem("staff_shift_started_date");
    setStaffName(null);
    toast.info("Turni u mbyll");
  }, []);

  // Splash screen
  if (showSplash) {
    return <SplashScreen onFinish={() => { setShowSplash(false); sessionStorage.setItem("staff_splash_shown", "1"); }} />;
  }

  // QR Scanner overlay
  if (showScanner) {
    return <QrScanner onScan={handleQrScan} onClose={() => setShowScanner(false)} />;
  }

  // Loading state
  if (isValid === null && activeToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Duke verifikuar turnin...</p>
        </div>
      </div>
    );
  }

  // No active shift — show scan home screen
  if (!isValid || !activeToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-8">
           {/* Logo */}
           <div className="space-y-2 relative">
             <img src={boulevardLogo} alt="Boulevard Café Logo" className="w-24 h-24 mx-auto rounded-2xl shadow-lg object-contain" />
             <h1 className="text-2xl font-bold text-foreground">Boulevard Café</h1>
            <p className="text-muted-foreground text-sm">Stafi — Thirrjet Live</p>
          </div>

          {/* Scan button */}
          <Button
            size="lg"
            onClick={() => setShowScanner(true)}
            className="w-full h-16 text-lg gap-3 bg-primary hover:bg-primary/90"
          >
            <QrCode className="h-6 w-6" />
            Skano QR-në e Turnit
          </Button>

          {/* Admin bypass — visible button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdminBypass}
            className="w-full border-dashed"
          >
            🔑 Hyrje me fjalëkalim admin
          </Button>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Skano kodin QR të turnit që gjendet në dashboard për të aktivizuar njoftimet e thirrjeve.
          </p>

          {/* Expired message if coming from expired shift */}
          {isValid === false && activeToken === null && (
            <Card className="p-4 border-warning/30 bg-warning/5">
              <div className="flex items-center gap-2 text-warning text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                Turni i mëparshëm ka skaduar. Skano QR-në e re.
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Active shift — live notifications view
  const totalPending = requests.length + orders.length;

  // Require per-staff PIN identification after shift token is validated
  if (!staffName) {
    return (
      <StaffPinLogin
        shiftToken={activeToken}
        onSuccess={(name) => setStaffName(name)}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-background px-3 pb-8 touch-manipulation"
      onClick={enableAudio}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-lg mx-auto space-y-3">
        {isRefreshing && (
          <div className="flex justify-center py-2">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {/* Header — ule 1.5 cm (~56px) për ta bërë më të arritshëm në mobile */}
        <div className="text-center space-y-1 pt-14">
          <h1 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Thirrjet Live
            {totalPending > 0 && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse text-xs ml-1">
                {totalPending}
              </Badge>
            )}
          </h1>
          <div className="flex justify-center">
            <RomeClock />
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1 h-8 text-xs">
              <Clock className="h-3 w-3" />
              {timeLeft}
            </Badge>
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate("/pos")}
              className="gap-1 h-8 text-xs bg-primary hover:bg-primary/90"
            >
              <Receipt className="h-3 w-3" />
              POS
            </Button>
            {!audioEnabled ? (
              <Button size="sm" variant="outline" onClick={enableAudio} className="gap-1 h-8 text-xs">
                <Volume2 className="h-3 w-3" />
                Aktivizo zërin
              </Button>
            ) : (
              <Badge className="bg-success/20 text-success border-success/30 gap-1 h-8 text-xs">
                <Volume2 className="h-3 w-3" />
                Aktiv
              </Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEndShift}
              className="gap-1 h-8 text-xs text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3 w-3" />
              Dil
            </Button>
          </div>
          {staffName && (
            <div className="text-[11px] text-muted-foreground">
              Kyçur si <span className="font-semibold text-foreground">{staffName}</span>
              <button type="button"
                onClick={() => {
                  localStorage.removeItem("staff_name");
                  localStorage.removeItem("staff_role");
                  setStaffName(null);
                }}
                className="ml-2 underline hover:text-primary"
              >
                ndrysho përdorues
              </button>
            </div>
          )}
        </div>

        {/* Pending Requests */}
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-warning" />
            Kërkesa ({requests.length})
          </h2>
          {requests.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground text-sm">Nuk ka kërkesa aktive ✨</p>
            </Card>
          ) : (
            requests.map((r) => {
              const isCompleting = completingIds.has(r.id);
              return (
                <Card key={r.id} className="p-3 border-l-4 border-l-warning">
                  <div className="flex items-center gap-3">
                    {r.request_type === "waiter" ? (
                      <Bell className="h-5 w-5 text-warning flex-shrink-0" />
                    ) : (
                      <Receipt className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{r.table_number}</p>
                        <ElapsedBadge createdAt={r.created_at} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.request_type === "waiter" ? "Kamarier" : "Faturë"} •{" "}
                        {new Date(r.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleCompleteRequest(r.id, r.table_number); }}
                      disabled={isCompleting}
                      className="bg-success hover:bg-success/90 text-success-foreground h-12 px-4 flex-shrink-0 touch-manipulation"
                    >
                      {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span className="ml-1 text-sm">U krye</span>
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Pending Orders */}
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-primary" />
            Porosi ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground text-sm">Nuk ka porosi aktive ✨</p>
            </Card>
          ) : (
            orders.map((o) => {
              const isCompleting = completingIds.has(o.id);
              return (
                <Card key={o.id} className="p-3 border-l-4 border-l-primary">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{o.table_number}</p>
                        <ElapsedBadge createdAt={o.created_at} />
                      </div>
                      <Badge className="bg-primary/20 text-primary">{o.total_price} L</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {o.items.map((item, i) => (
                        <span key={i}>
                          {item.quantity}x {item.name}
                          {i < o.items.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                    {o.notes && <p className="text-xs italic text-muted-foreground">📝 {o.notes}</p>}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDecideOrder(o.id, o.table_number, "rejected"); }}
                          disabled={isCompleting}
                          variant="outline"
                          className="h-12 px-4 border-destructive/40 text-destructive hover:bg-destructive/10 touch-manipulation"
                        >
                          {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          <span className="ml-1 text-sm">Refuzo</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDecideOrder(o.id, o.table_number, "accepted"); }}
                          disabled={isCompleting}
                          className="bg-success hover:bg-success/90 text-success-foreground h-12 px-4 touch-manipulation"
                        >
                          {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          <span className="ml-1 text-sm">Prano</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          Boulevard Café • Turni aktiv deri në fund
        </p>
      </div>
    </div>
  );
};

export default StaffShift;
