import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, CheckCircle, X, UtensilsCrossed, Volume2, Clock, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import boulevardLogo from "@/assets/boulevard-logo.png";

interface ServiceRequest {
  id: string;
  table_number: string;
  request_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface Order {
  id: string;
  table_number: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  total_price: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  notes: string | null;
}

const Dashboard = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationType, setNotificationType] = useState<'voice' | 'sound'>('voice');
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const repeatTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const repeatCountRef = useRef<Map<string, number>>(new Map());
  const audioEnabledRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const notificationTypeRef = useRef<'voice' | 'sound'>('voice');
  const titleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>('Boulevard Staff');

  // Curtain state - QR overlay
  const [curtainActive, setCurtainActive] = useState(true);
  const [shiftToken, setShiftToken] = useState<string | null>(null);
  const [staffUrl, setStaffUrl] = useState<string>('');

  // Generate or fetch active shift token for curtain QR
  const ensureShiftToken = async () => {
    const now = new Date();
    const hour = now.getHours();
    let shiftStart: Date, shiftEnd: Date;

    if (hour >= 3 && hour < 15) {
      shiftStart = new Date(now); shiftStart.setHours(3, 0, 0, 0);
      shiftEnd = new Date(now); shiftEnd.setHours(15, 0, 0, 0);
    } else {
      shiftStart = new Date(now);
      if (hour >= 15) {
        shiftStart.setHours(15, 0, 0, 0);
        shiftEnd = new Date(now); shiftEnd.setDate(shiftEnd.getDate() + 1); shiftEnd.setHours(3, 0, 0, 0);
      } else {
        shiftStart.setDate(shiftStart.getDate() - 1); shiftStart.setHours(15, 0, 0, 0);
        shiftEnd = new Date(now); shiftEnd.setHours(3, 0, 0, 0);
      }
    }

    // Check existing
    const { data: existing } = await supabase
      .from("shift_tokens")
      .select("token, unlocked")
      .gte("shift_end", now.toISOString())
      .lte("shift_start", now.toISOString())
      .maybeSingle();

    if (existing) {
      setShiftToken(existing.token);
      setStaffUrl(`${window.location.origin}/staff?token=${existing.token}`);
      if (existing.unlocked) setCurtainActive(false);
      return existing.token;
    }

    // Generate new
    const token = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
    await supabase.from("shift_tokens").insert({
      token, shift_start: shiftStart.toISOString(), shift_end: shiftEnd.toISOString(),
    });
    setShiftToken(token);
    setStaffUrl(`${window.location.origin}/staff?token=${token}`);
    return token;
  };

  // On mount: generate token and listen for unlock via realtime
  useEffect(() => {
    ensureShiftToken();

    // Listen for shift_tokens UPDATE (unlocked = true)
    const unlockChannel = supabase
      .channel("shift-unlock")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shift_tokens" }, (payload) => {
        const updated = payload.new as any;
        if (updated.unlocked && updated.token === shiftToken) {
          setCurtainActive(false);
          toast.success("🔓 Turni u aktivizua nga kamarieri!");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(unlockChannel); };
  }, [shiftToken]);

  // Poll for unlock status every 5 seconds as backup
  useEffect(() => {
    if (!curtainActive || !shiftToken) return;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("shift_tokens")
        .select("unlocked")
        .eq("token", shiftToken)
        .maybeSingle();
      if (data?.unlocked) {
        setCurtainActive(false);
        toast.success("🔓 Turni u aktivizua!");
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [curtainActive, shiftToken]);

  // Visual notification - flashing tab title
  useEffect(() => {
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalPending = pendingRequests + pendingOrders;

    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }

    if (totalPending > 0) {
      let isAlternate = false;
      titleIntervalRef.current = setInterval(() => {
        document.title = isAlternate ? `🔔 ${totalPending} në pritje!` : `⚠️ KËRKESË E RE!`;
        isAlternate = !isAlternate;
      }, 1000);
    } else {
      document.title = originalTitleRef.current;
    }

    return () => {
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
      document.title = originalTitleRef.current;
    };
  }, [requests, orders]);

  // Load notification preference
  useEffect(() => {
    const savedType = localStorage.getItem('notification_type') as 'voice' | 'sound';
    if (savedType) { setNotificationType(savedType); notificationTypeRef.current = savedType; }
  }, []);

  const loadPreferredVoice = () => {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const enUs = voices.find(v => v.lang?.toLowerCase() === 'en-us');
    const enGeneric = voices.find(v => v.lang?.toLowerCase().startsWith('en'));
    selectedVoiceRef.current = enUs || enGeneric || null;
  };

  if ('speechSynthesis' in window) {
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => loadPreferredVoice();
    } else {
      loadPreferredVoice();
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      return (await Notification.requestPermission()) === 'granted';
    }
    return false;
  };

  const showSystemNotification = (title: string, body: string, requestType: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png',
        tag: `${requestType}-${Date.now()}`, requireInteraction: true,
      });
      notification.onclick = () => { window.focus(); notification.close(); };
    }
  };

  const enableAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      if (!audioEnabledRef.current && 'speechSynthesis' in window) {
        loadPreferredVoice();
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        window.speechSynthesis.speak(u);
        audioEnabledRef.current = true;
      }
      await requestNotificationPermission();
    } catch {}
  };

  const playBellSound = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const playDingDong = () => {
        const t = ctx.currentTime;
        const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
        o1.connect(g1).connect(ctx.destination);
        o1.frequency.setValueAtTime(1200, t); g1.gain.setValueAtTime(0.6, t);
        g1.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        o1.start(t); o1.stop(t + 0.3);

        const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
        o2.connect(g2).connect(ctx.destination);
        o2.frequency.setValueAtTime(900, t + 0.25);
        g2.gain.setValueAtTime(0.001, t); g2.gain.setValueAtTime(0.6, t + 0.25);
        g2.gain.exponentialRampToValueAtTime(0.01, t + 0.65);
        o2.start(t + 0.25); o2.stop(t + 0.65);
      };
      playDingDong();
      setTimeout(() => playDingDong(), 1000);
      setTimeout(() => playDingDong(), 2000);
    } catch {}
  };

  const playAudioNotification = (requestType: string, tableNumber: string, isReminder = false) => {
    playBellSound();
    const title = isReminder ? `⏰ Rikujtim - ${tableNumber}` : `🔔 Kërkesë e re - ${tableNumber}`;
    const body = requestType === 'waiter' ? 'Kërkon kamarier' : requestType === 'bill' ? 'Kërkon faturën' : 'Porosi e re';
    showSystemNotification(title, body, requestType);

    if (notificationTypeRef.current === 'voice' && 'speechSynthesis' in window) {
      const text = requestType === 'waiter'
        ? `Table ${tableNumber} requests service`
        : requestType === 'bill' ? `Table ${tableNumber} requests the bill` : `New order from table ${tableNumber}`;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; utterance.rate = 0.9; utterance.volume = 1.0;
      if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
      window.speechSynthesis.speak(utterance);
    }
  };

  const scheduleRepeatNotification = (requestId: string, requestType: string, tableNumber: string) => {
    const existing = repeatTimersRef.current.get(requestId);
    if (existing) clearTimeout(existing);
    const count = repeatCountRef.current.get(requestId) || 0;
    if (count < 5) {
      const timer = setTimeout(() => {
        const req = requests.find(r => r.id === requestId && r.status === 'pending');
        const ord = orders.find(o => o.id === requestId && o.status === 'pending');
        if (req || ord) {
          playAudioNotification(requestType, tableNumber, true);
          toast.warning(`⏰ Rikujtim! ${tableNumber} pret ende`);
          repeatCountRef.current.set(requestId, count + 1);
          scheduleRepeatNotification(requestId, requestType, tableNumber);
        }
      }, 180000);
      repeatTimersRef.current.set(requestId, timer);
    } else {
      repeatCountRef.current.delete(requestId);
      repeatTimersRef.current.delete(requestId);
    }
  };

  const clearRepeatNotification = (requestId: string) => {
    const timer = repeatTimersRef.current.get(requestId);
    if (timer) { clearTimeout(timer); repeatTimersRef.current.delete(requestId); }
    repeatCountRef.current.delete(requestId);
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase.from('service_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch { toast.error('Gabim në marrjen e kërkesave'); } finally { setIsLoading(false); }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch { toast.error('Gabim në marrjen e porosive'); }
  };

  const handleComplete = async (id: string) => {
    clearRepeatNotification(id);
    const { error } = await supabase.from('service_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error('Gabim');
    else toast.success('Kërkesa u përmbyll');
  };

  const handleCancel = async (id: string) => {
    clearRepeatNotification(id);
    const { error } = await supabase.from('service_requests').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast.error('Gabim');
    else toast.success('Kërkesa u anulua');
  };

  const handleCompleteOrder = async (id: string) => {
    clearRepeatNotification(id);
    const { error } = await supabase.from('orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error('Gabim');
    else toast.success('Porosia u përmbyll');
  };

  const handleCancelOrder = async (id: string) => {
    clearRepeatNotification(id);
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast.error('Gabim');
    else toast.success('Porosia u anulua');
  };

  // Realtime subscriptions - ALWAYS ACTIVE (even behind curtain)
  useEffect(() => {
    fetchRequests();
    fetchOrders();

    const channel = supabase
      .channel('service-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'service_requests' }, (payload) => {
        const r = payload.new as ServiceRequest;
        setRequests(prev => [r, ...prev]);
        playAudioNotification(r.request_type, r.table_number);
        scheduleRepeatNotification(r.id, r.request_type, r.table_number);
        toast.success('Kërkesë e re!', { description: `${r.table_number} - ${r.request_type === 'waiter' ? 'Kamarier' : 'Faturë'}` });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_requests' }, (payload) => {
        const u = payload.new as ServiceRequest;
        setRequests(prev => prev.map(r => r.id === u.id ? u : r));
        if (u.status !== 'pending') clearRepeatNotification(u.id);
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const o = payload.new as Order;
        setOrders(prev => [o, ...prev]);
        playAudioNotification('order', o.table_number);
        scheduleRepeatNotification(o.id, 'order', o.table_number);
        toast.success('Porosi e re!', { description: `${o.table_number} - ${o.items.length} artikuj` });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const u = payload.new as Order;
        setOrders(prev => prev.map(o => o.id === u.id ? u : o));
        if (u.status !== 'pending') clearRepeatNotification(u.id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, (payload) => {
        setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id));
      })
      .subscribe();

    const deleteChannel = supabase
      .channel('service-requests-delete')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'service_requests' }, (payload) => {
        setRequests(prev => prev.filter(r => r.id !== (payload.old as ServiceRequest).id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(deleteChannel);
      repeatTimersRef.current.forEach(t => clearTimeout(t));
      repeatTimersRef.current.clear();
      repeatCountRef.current.clear();
    };
  }, []);

  // Polling backup every 5 seconds - ALWAYS ACTIVE
  useEffect(() => {
    const poll = setInterval(() => { fetchRequests(); fetchOrders(); }, 5000);
    return () => clearInterval(poll);
  }, []);

  // Elapsed time
  useEffect(() => {
    const update = () => {
      const times = [
        ...requests.filter(r => r.status === 'pending').map(r => new Date(r.created_at).getTime()),
        ...orders.filter(o => o.status === 'pending').map(o => new Date(o.created_at).getTime()),
      ];
      if (times.length === 0) { setElapsedTime(''); return; }
      const diff = Date.now() - Math.min(...times);
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [requests, orders]);

  const handleNotificationTypeChange = (type: 'voice' | 'sound') => {
    setNotificationType(type); notificationTypeRef.current = type;
    localStorage.setItem('notification_type', type);
    if (type === 'sound') { playBellSound(); toast.success('Tingull aktivizuar'); }
    else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance('Voice notifications enabled');
        u.lang = 'en-US'; u.rate = 0.9;
        if (selectedVoiceRef.current) u.voice = selectedVoiceRef.current;
        window.speechSynthesis.speak(u);
      }
      toast.success('Zëri aktivizuar');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const handleDeleteFromHistory = async (id: string, type: 'request' | 'order') => {
    const table = type === 'request' ? 'service_requests' : 'orders';
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    if (error) toast.error('Gabim');
    else toast.success('U fshi nga historiku');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-warning text-warning-foreground">Në pritje</Badge>;
      case 'completed': return <Badge className="bg-success text-success-foreground">Përfunduar</Badge>;
      case 'cancelled': return <Badge variant="destructive">Anuluar</Badge>;
      default: return null;
    }
  };

  const getRequestIcon = (type: string) => type === 'waiter' ? <Bell className="h-5 w-5" /> : <Receipt className="h-5 w-5" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-3 flex flex-col relative" onClick={enableAudio}>
      <audio ref={audioRef} />

      {/* ===== QR CURTAIN OVERLAY ===== */}
      {curtainActive && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <img src={boulevardLogo} alt="Boulevard Café" className="w-20 h-20 mx-auto rounded-2xl shadow-lg object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Boulevard Café</h1>
              <p className="text-muted-foreground text-sm mt-1">Dashboard i Stafit</p>
            </div>

            {staffUrl ? (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl inline-block shadow-lg">
                  <QRCodeSVG value={staffUrl} size={220} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Skano me telefon nga <strong>/staff</strong> për të hapur dashboard-in
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <QrCode className="h-4 w-4" />
                  <span>Njoftimet zanore janë aktive edhe tani</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground animate-pulse">Duke gjeneruar QR kodin...</p>
            )}
          </div>
        </div>
      )}

      {/* ===== DASHBOARD CONTENT (always rendered) ===== */}
      <div className="max-w-7xl mx-auto space-y-3 flex-1 w-full">
        <div className="text-center space-y-1 relative">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            {(pendingRequests.length > 0 || pendingOrders.length > 0) && (
              <div className="flex items-center gap-2 animate-pulse-glow rounded-full px-3 py-1 bg-warning/20">
                <Bell className="h-4 w-4 text-warning animate-bounce-soft" />
                <span className="font-bold text-warning text-sm">{pendingRequests.length + pendingOrders.length}</span>
              </div>
            )}
            {elapsedTime && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-destructive/20 border border-destructive/30">
                <Clock className="h-4 w-4 text-destructive" />
                <span className="font-mono font-bold text-destructive text-sm">{elapsedTime}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Boulevard Café Elbasan</p>
        </div>

        {/* Notification Settings */}
        <Card className="p-3 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-secondary" />
              <span className="font-semibold text-xs">Njoftim</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant={notificationType === 'voice' ? 'default' : 'outline'} size="sm"
                onClick={() => handleNotificationTypeChange('voice')} className="gap-1.5 h-9 px-3 touch-manipulation">
                <Volume2 className="h-3.5 w-3.5" /><span className="text-xs">Zë</span>
              </Button>
              <Button variant={notificationType === 'sound' ? 'default' : 'outline'} size="sm"
                onClick={() => handleNotificationTypeChange('sound')} className="gap-1.5 h-9 px-3 touch-manipulation">
                <Bell className="h-3.5 w-3.5" /><span className="text-xs">Tingull</span>
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => { enableAudio(); playBellSound(); }}
                className="gap-1.5 h-9 px-3 touch-manipulation bg-success/20 border-success/40 hover:bg-success/30">
                <Volume2 className="h-3.5 w-3.5 text-success" /><span className="text-xs font-bold text-success">TEST</span>
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setCurtainActive(true)}
                className="gap-1.5 h-9 px-3 touch-manipulation bg-primary/20 border-primary/40 hover:bg-primary/30">
                <QrCode className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-bold text-primary">QR</span>
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-3 grid-cols-3">
          {/* Pending Requests */}
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" /><span>Kërkesa ({pendingRequests.length})</span>
            </h2>
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nuk ka kërkesa</p>
              ) : pendingRequests.map((request) => (
                <Card key={request.id} className="p-3 bg-card/50 border-l-4 border-l-warning touch-manipulation">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getRequestIcon(request.request_type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{request.table_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{request.request_type === 'waiter' ? 'Kamarier' : 'Faturë'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => handleComplete(request.id)} className="bg-success hover:bg-success/90 h-12 w-12 p-0 touch-manipulation">
                        <CheckCircle className="h-5 w-5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(request.id)} className="h-12 w-12 p-0 touch-manipulation">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Pending Orders */}
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" /><span>Porosi ({pendingOrders.length})</span>
            </h2>
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {pendingOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nuk ka porosi</p>
              ) : pendingOrders.map((order) => (
                <Card key={order.id} className="p-3 bg-card/50 border-l-4 border-l-primary touch-manipulation">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{order.table_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => handleCompleteOrder(order.id)} className="bg-success hover:bg-success/90 h-12 w-12 p-0 touch-manipulation">
                          <CheckCircle className="h-5 w-5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleCancelOrder(order.id)} className="h-12 w-12 p-0 touch-manipulation">
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 border-t pt-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="truncate">{item.quantity}x {item.name}</span>
                          <span className="font-semibold whitespace-nowrap ml-2">{(item.price * item.quantity).toLocaleString()} L</span>
                        </div>
                      ))}
                      {order.notes && (
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Shënime:</p>
                          <p className="text-xs bg-muted/50 p-2 rounded-lg">{order.notes}</p>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm border-t pt-1.5 mt-1">
                        <span>Totali:</span>
                        <span className="text-primary">{order.total_price.toLocaleString()} L</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* History */}
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" /><span>Historiku ({completedRequests.length + completedOrders.length})</span>
            </h2>
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {completedRequests.length === 0 && completedOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Bosh</p>
              ) : (
                <>
                  {completedRequests.map((request) => (
                    <Card key={`req-${request.id}`} className="p-2.5 bg-muted/30 touch-manipulation">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getRequestIcon(request.request_type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-bold text-sm truncate">{request.table_number}</p>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{request.request_type === 'waiter' ? 'Kamarier' : 'Faturë'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteFromHistory(request.id, 'request')} className="h-8 w-8 p-0 touch-manipulation">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {completedOrders.map((order) => (
                    <Card key={`ord-${order.id}`} className="p-2.5 bg-muted/30 touch-manipulation">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <UtensilsCrossed className="h-4 w-4" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-bold text-sm truncate">{order.table_number}</p>
                              {getStatusBadge(order.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">Porosi</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {order.notes && <p className="text-xs bg-muted/50 p-1.5 rounded mt-1 italic">{order.notes}</p>}
                            <p className="text-xs font-semibold mt-0.5">{order.total_price.toLocaleString()} L</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteFromHistory(order.id, 'order')} className="h-8 w-8 p-0 touch-manipulation">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">Boulevard Café Elbasan • WhatsApp: +355 67 401 0030</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
