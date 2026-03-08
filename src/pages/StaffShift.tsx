import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, Volume2, Clock, AlertTriangle } from "lucide-react";

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

const StaffShift = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [shiftEnd, setShiftEnd] = useState<Date | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);

  // Validate token
  useEffect(() => {
    if (!token) {
      setIsValid(false);
      return;
    }

    const validate = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("shift_tokens")
        .select("*")
        .eq("token", token)
        .gte("shift_end", now)
        .lte("shift_start", now)
        .maybeSingle();

      if (error || !data) {
        setIsValid(false);
        return;
      }
      setIsValid(true);
      setShiftEnd(new Date(data.shift_end));
    };
    validate();
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (!shiftEnd) return;
    const interval = setInterval(() => {
      const now = new Date();
      const diff = shiftEnd.getTime() - now.getTime();
      if (diff <= 0) {
        setIsValid(false);
        setTimeLeft("Turni ka mbaruar");
        clearInterval(interval);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    }, 30000);
    // Run immediately
    const diff = shiftEnd.getTime() - Date.now();
    if (diff > 0) {
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    }
    return () => clearInterval(interval);
  }, [shiftEnd]);

  const playDingDong = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Ding
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.value = 830;
    osc1.type = "sine";
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Dong
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.value = 620;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.4, now + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.3);
    osc2.stop(now + 0.8);
  }, []);

  const enableAudio = useCallback(() => {
    if (audioEnabled) return;
    try {
      audioContextRef.current = new AudioContext();
      setAudioEnabled(true);
    } catch {}
  }, [audioEnabled]);

  // Fetch data
  const fetchData = useCallback(async () => {
    const [reqRes, ordRes] = await Promise.all([
      supabase.from("service_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("orders").select("*").eq("status", "pending").order("created_at", { ascending: true }),
    ]);
    if (reqRes.data) setRequests(reqRes.data as ServiceRequest[]);
    if (ordRes.data) setOrders(ordRes.data as unknown as Order[]);
  }, []);

  // Realtime + polling
  useEffect(() => {
    if (!isValid) return;
    fetchData();

    const channel = supabase
      .channel("staff-shift-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () => {
        fetchData();
        playDingDong();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchData();
        playDingDong();
      })
      .subscribe();

    const poll = setInterval(fetchData, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [isValid, fetchData, playDingDong]);

  // Invalid / expired token
  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Duke kontrolluar...</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background p-3" onClick={enableAudio}>
      {/* Header */}
      <div className="max-w-lg mx-auto space-y-3">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Thirrjet Live
          </h1>
          <div className="flex items-center justify-center gap-3">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {timeLeft}
            </Badge>
            {!audioEnabled && (
              <Button size="sm" variant="outline" onClick={enableAudio} className="gap-1 h-7 text-xs">
                <Volume2 className="h-3 w-3" />
                Aktivizo zërin
              </Button>
            )}
            {audioEnabled && (
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
              <p className="text-muted-foreground text-sm">Nuk ka kërkesa aktive</p>
            </Card>
          ) : (
            requests.map((r) => (
              <Card key={r.id} className="p-3 border-l-4 border-l-warning">
                <div className="flex items-center gap-3">
                  {r.request_type === "waiter" ? (
                    <Bell className="h-5 w-5 text-warning" />
                  ) : (
                    <Receipt className="h-5 w-5 text-primary" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-lg">{r.table_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.request_type === "waiter" ? "Kamarier" : "Faturë"} •{" "}
                      {new Date(r.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge className="bg-warning/20 text-warning">Në pritje</Badge>
                </div>
              </Card>
            ))
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
              <p className="text-muted-foreground text-sm">Nuk ka porosi aktive</p>
            </Card>
          ) : (
            orders.map((o) => (
              <Card key={o.id} className="p-3 border-l-4 border-l-primary">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-lg">{o.table_number}</p>
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
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </Card>
            ))
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
