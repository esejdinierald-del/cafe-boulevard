import { useEffect, useState, useRef, useCallback, TouchEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, Volume2, Clock, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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

const StaffShift = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [shiftEnd, setShiftEnd] = useState<Date | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Validate token
  useEffect(() => {
    if (!token) { setIsValid(false); return; }
    const validate = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("shift_tokens")
        .select("*")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();
      if (error || !data) { setIsValid(false); return; }
      setIsValid(true);
      setShiftEnd(new Date(data.shift_end));
    };
    validate();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (!shiftEnd) return;
    const update = () => {
      const diff = shiftEnd.getTime() - Date.now();
      if (diff <= 0) { setIsValid(false); setTimeLeft("Turni ka mbaruar"); return false; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
      return true;
    };
    update();
    const interval = setInterval(() => { if (!update()) clearInterval(interval); }, 30000);
    return () => clearInterval(interval);
  }, [shiftEnd]);

  const playDingDong = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.value = 830; osc1.type = "sine";
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now); osc1.stop(now + 0.4);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.value = 620; osc2.type = "sine";
    gain2.gain.setValueAtTime(0.4, now + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.3); osc2.stop(now + 0.8);
  }, []);

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
        vibrate: [200, 100, 200],
      } as NotificationOptions);
      notification.onclick = () => { window.focus(); notification.close(); };
    }
  }, []);

  const repeatNotification = useCallback((title: string, body: string) => {
    playDingDong(); showSystemNotification(title, body);
    const t1 = setTimeout(() => { playDingDong(); showSystemNotification(title, body); }, 4000);
    const t2 = setTimeout(() => { playDingDong(); showSystemNotification(title, body); }, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [playDingDong, showSystemNotification]);

  const enableAudio = useCallback(async () => {
    if (audioEnabled) return;
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      const notifGranted = await requestNotificationPermission();
      setAudioEnabled(true);
      if (notifGranted) toast.success("Zëri dhe njoftimet u aktivizuan!");
      else toast.success("Zëri u aktivizua!");
    } catch {}
  }, [audioEnabled, requestNotificationPermission]);

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pullDistance = useRef(0);

  // Fetch data
  const fetchData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    const [reqRes, ordRes] = await Promise.all([
      supabase.from("service_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("orders").select("*").eq("status", "pending").order("created_at", { ascending: true }),
    ]);
    if (reqRes.data) setRequests(reqRes.data as ServiceRequest[]);
    if (ordRes.data) setOrders(ordRes.data as unknown as Order[]);
    setLastRefresh(new Date());
    if (showIndicator) setTimeout(() => setIsRefreshing(false), 300);
  }, []);

  // Complete a service request
  const handleCompleteRequest = useCallback(async (id: string, tableNumber: string) => {
    setCompletingIds(prev => new Set(prev).add(id));
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Gabim në përditësim");
    } else {
      toast.success(`✅ ${tableNumber} — U krye!`);
      setRequests(prev => prev.filter(r => r.id !== id));
    }
    setCompletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  // Complete an order
  const handleCompleteOrder = useCallback(async (id: string, tableNumber: string) => {
    setCompletingIds(prev => new Set(prev).add(id));
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Gabim në përditësim");
    } else {
      toast.success(`✅ Porosia ${tableNumber} — U krye!`);
      setOrders(prev => prev.filter(o => o.id !== id));
    }
    setCompletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  // Realtime + polling
  useEffect(() => {
    if (!isValid) return;
    fetchData();
    const channel = supabase
      .channel("staff-shift-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests" }, (payload) => {
        fetchData();
        const r = payload.new as any;
        const type = r.request_type === "waiter" ? "Kamarier" : "Faturë";
        repeatNotification(`🔔 ${type} - ${r.table_number}`, `Kërkesë e re nga ${r.table_number}`);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        fetchData();
        const o = payload.new as any;
        repeatNotification(`🛒 Porosi - ${o.table_number}`, `Porosi e re ${o.total_price} L nga ${o.table_number}`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests" }, () => fetchData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => fetchData())
      .subscribe();
    const poll = setInterval(fetchData, 10000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [isValid, fetchData, repeatNotification]);

  // Loading state
  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Expired / invalid
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center space-y-4 max-w-sm w-full">
          <AlertTriangle className="h-12 w-12 mx-auto text-warning" />
          <h1 className="text-xl font-bold">Turni ka mbaruar</h1>
          <p className="text-muted-foreground text-sm">
            Ky kod QR ka skaduar ose nuk është i vlefshëm. Skanoni kodin e ri të turnit nga dashboard-i.
          </p>
        </Card>
      </div>
    );
  }

  const totalPending = requests.length + orders.length;

  return (
    <div className="min-h-screen bg-background p-3 pb-8" onClick={enableAudio}>
      <div className="max-w-lg mx-auto space-y-3">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Thirrjet Live
            {totalPending > 0 && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse text-xs ml-1">
                {totalPending}
              </Badge>
            )}
          </h1>
          <div className="flex items-center justify-center gap-3">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {timeLeft}
            </Badge>
            {!audioEnabled ? (
              <Button size="sm" variant="outline" onClick={enableAudio} className="gap-1 h-7 text-xs">
                <Volume2 className="h-3 w-3" />
                Aktivizo zërin
              </Button>
            ) : (
              <Badge className="bg-success/20 text-success border-success/30 gap-1">
                <Volume2 className="h-3 w-3" />
                Aktiv
              </Badge>
            )}
          </div>
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
                      className="bg-success hover:bg-success/90 text-success-foreground h-10 px-3 flex-shrink-0"
                    >
                      {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      <span className="ml-1 text-xs">U krye</span>
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
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleCompleteOrder(o.id, o.table_number); }}
                        disabled={isCompleting}
                        className="bg-success hover:bg-success/90 text-success-foreground h-10 px-3"
                      >
                        {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span className="ml-1 text-xs">U krye</span>
                      </Button>
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
