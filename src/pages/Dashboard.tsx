import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, UtensilsCrossed, Volume2, Clock, QrCode, VolumeX, Receipt, GripVertical, Lock, Settings2, RotateCcw, Move, X, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import YouTube from "react-youtube";
import { KDSPanel, CashierPanel } from "@/components/pos/POSPanels";
import { useShiftCurtain } from "@/hooks/useShiftCurtain";
import { QRCurtain } from "@/components/dashboard/QRCurtain";
import {
  RequestsOrdersPanel,
  type ServiceRequest,
  type Order,
} from "@/components/dashboard/RequestsOrdersPanel";
import { SongsPanel, type SongRequest } from "@/components/dashboard/SongsPanel";
import { staffRead } from "@/lib/staff-read";

const Dashboard = () => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
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
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const ordersPrimedRef = useRef(false);

  // Curtain / shift token — handled by dedicated hook.
  const { curtainActive, setCurtainActive, shiftToken, staffUrl } = useShiftCurtain();

  // Music tab state
  const [activeTab, setActiveTab] = useState<"requests" | "songs" | "bar" | "kitchen" | "cashier">("requests");
  // Drag & drop button ordering for top control bar
  const DEFAULT_BTN_ORDER = ["voice", "sound", "test", "qr", "arka", "ready", "mute"];
  const [btnOrder, setBtnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dashboard-btn-order");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const merged = [...parsed.filter((x) => DEFAULT_BTN_ORDER.includes(x))];
        DEFAULT_BTN_ORDER.forEach((k) => { if (!merged.includes(k)) merged.push(k); });
        return merged;
      }
    } catch {}
    return DEFAULT_BTN_ORDER;
  });
  const [reorderMode, setReorderMode] = useState(false);
  const dragKeyRef = useRef<string | null>(null);
  useEffect(() => {
    localStorage.setItem("dashboard-btn-order", JSON.stringify(btnOrder));
  }, [btnOrder]);
  // Detached (floating) buttons — pulled OUT of the top control bar
  const [detached, setDetached] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const s = localStorage.getItem("dashboard-btn-detached");
      if (s) return JSON.parse(s);
    } catch {}
    return {};
  });
  useEffect(() => {
    localStorage.setItem("dashboard-btn-detached", JSON.stringify(detached));
  }, [detached]);
  const detachBtn = (key: string) => {
    setDetached((p) => ({ ...p, [key]: p[key] ?? { x: 24, y: 120 } }));
  };
  const dockBtn = (key: string) => {
    setDetached((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  };
  const floatDragRef = useRef<{ key: string; dx: number; dy: number } | null>(null);
  const onFloatPointerDown = (key: string) => (e: React.PointerEvent) => {
    const pos = detached[key] ?? { x: 24, y: 120 };
    floatDragRef.current = { key, dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onFloatPointerMove = (e: React.PointerEvent) => {
    const d = floatDragRef.current;
    if (!d) return;
    const x = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - d.dx));
    const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - d.dy));
    setDetached((p) => ({ ...p, [d.key]: { x, y } }));
  };
  const onFloatPointerUp = () => { floatDragRef.current = null; };
  // Layout / dimension settings — persisted to localStorage
  const DEFAULT_LAYOUT = { zoom: 100, maxWidth: 1280, btnHeight: 40, btnFont: 14, bannerPadY: 12, bannerFont: 18 };
  const [layout, setLayout] = useState(() => {
    try {
      const s = localStorage.getItem("dashboard-layout");
      if (s) return { ...DEFAULT_LAYOUT, ...JSON.parse(s) };
    } catch {}
    return DEFAULT_LAYOUT;
  });
  useEffect(() => {
    localStorage.setItem("dashboard-layout", JSON.stringify(layout));
  }, [layout]);
  const setL = (k: keyof typeof DEFAULT_LAYOUT, v: number) => setLayout((p: typeof DEFAULT_LAYOUT) => ({ ...p, [k]: v }));
  const btnStyle: React.CSSProperties = {
    height: `${layout.btnHeight}px`,
    fontSize: `${layout.btnFont}px`,
    paddingLeft: `${Math.max(10, layout.btnHeight * 0.35)}px`,
    paddingRight: `${Math.max(10, layout.btnHeight * 0.35)}px`,
  };
  const moveBtn = (from: string, to: string) => {
    if (from === to) return;
    setBtnOrder((prev) => {
      const next = prev.filter((k) => k !== from);
      const idx = next.indexOf(to);
      next.splice(idx < 0 ? next.length : idx, 0, from);
      return next;
    });
  };
  const [barPending, setBarPending] = useState(0);
  const [kitchenPending, setKitchenPending] = useState(0);
  const [songRequests, setSongRequests] = useState<SongRequest[]>([]);
  const [playlist, setPlaylist] = useState<SongRequest[]>([]);
  const [currentSong, setCurrentSong] = useState<SongRequest | null>(null);
  const playerRef = useRef<any>(null);
  const [radioMode, setRadioMode] = useState(false);
  const lastVideoIdRef = useRef<string | null>(null);

  // Mute toggle (silences sounds, voice, system notifications and reminders)
  const [muteNotifications, setMuteNotifications] = useState(() => {
    try { return localStorage.getItem('mute_notifications') === 'true'; } catch { return false; }
  });
  const muteNotificationsRef = useRef(muteNotifications);
  useEffect(() => {
    muteNotificationsRef.current = muteNotifications;
    try { localStorage.setItem('mute_notifications', String(muteNotifications)); } catch {}
  }, [muteNotifications]);

  // Refs so realtime handlers see latest playlist/currentSong without re-subscribing
  const currentSongRef = useRef<SongRequest | null>(null);
  const playlistRef = useRef<SongRequest[]>([]);
  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);

  // Poll pending KDS split counts so tab buttons can pulse when new orders arrive
  // and the operator is on a different tab.
  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const [{ data: bar }, { data: kit }] = await Promise.all([
          staffRead<any[]>("order_items_split.pending", { kind: "bar" }),
          staffRead<any[]>("order_items_split.pending", { kind: "kitchen" }),
        ]);
        if (cancelled) return;
        setBarPending(Array.isArray(bar) ? bar.length : 0);
        setKitchenPending(Array.isArray(kit) ? kit.length : 0);
      } catch {}
    };
    pull();
    const t = setInterval(pull, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Public counter dashboard — access is gated by the QR shift curtain, not by login.
  useEffect(() => {
    setAuthorized(true);
  }, []);

  // Visual notification - flashing tab title
  useEffect(() => {
    const pendingRequests = requests.filter(r => r.status === 'pending' && r.request_type !== 'kitchen_ready').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalPending = pendingRequests + pendingOrders;

    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }

    if (totalPending > 0 && !muteNotifications) {
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
  }, [requests, orders, muteNotifications]);

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
    if (muteNotificationsRef.current) return;
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
    if (muteNotificationsRef.current) return;
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
    if (muteNotificationsRef.current) return;
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
    if (muteNotificationsRef.current) return;
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
      if (!shiftToken) return;
      const { data, error } = await supabase.functions.invoke("list-orders", {
        body: { shiftToken, status: "all" },
      });
      if (error) throw error;
      const list = ((data as any)?.orders ?? []) as Order[];
      // Newest first to match previous behaviour
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // Detect new pending orders (poll-based, since realtime is disabled for anon)
      if (ordersPrimedRef.current) {
        for (const o of list) {
          if (o.status === 'pending' && !seenOrderIdsRef.current.has(o.id)) {
            playAudioNotification('order', o.table_number);
            scheduleRepeatNotification(o.id, 'order', o.table_number);
            toast.success('Porosi e re!', { description: `${o.table_number} - ${o.items.length} artikuj` });
          }
        }
      }
      seenOrderIdsRef.current = new Set(list.map(o => o.id));
      ordersPrimedRef.current = true;
      // Clear reminders for orders no longer pending
      for (const o of list) {
        if (o.status !== 'pending') clearRepeatNotification(o.id);
      }
      setOrders(list);
    } catch { toast.error('Gabim në marrjen e porosive'); }
  };

  const handleComplete = async (id: string) => {
    clearRepeatNotification(id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-shift", {
        body: { action: "complete_request", id, token: shiftToken },
      });
      if (error || !data?.success) throw new Error("Failed");
      toast.success('Kërkesa u përmbyll');
    } catch { toast.error('Gabim'); }
  };

  const handleCancel = async (id: string) => {
    clearRepeatNotification(id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-shift", {
        body: { action: "cancel_request", id, token: shiftToken },
      });
      if (error || !data?.success) throw new Error("Failed");
      toast.success('Kërkesa u anulua');
    } catch { toast.error('Gabim'); }
  };

  const handleCompleteOrder = async (id: string) => {
    clearRepeatNotification(id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-shift", {
        body: { action: "complete_order", id, token: shiftToken },
      });
      if (error || !data?.success) throw new Error("Failed");
      toast.success('Porosia u përmbyll');
    } catch { toast.error('Gabim'); }
  };

  const handleCancelOrder = async (id: string) => {
    clearRepeatNotification(id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-shift", {
        body: { action: "cancel_order", id, token: shiftToken },
      });
      if (error || !data?.success) throw new Error("Failed");
      toast.success('Porosia u anulua');
    } catch { toast.error('Gabim'); }
  };

  // Realtime subscriptions — only after curtain is dismissed (shift validated)
  useEffect(() => {
    if (curtainActive) return;

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

    const deleteChannel = supabase
      .channel('service-requests-delete')
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'service_requests' }, (payload) => {
        setRequests(prev => prev.filter(r => r.id !== (payload.old as ServiceRequest).id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(deleteChannel);
      repeatTimersRef.current.forEach(t => clearTimeout(t));
      repeatTimersRef.current.clear();
      repeatCountRef.current.clear();
    };
  }, [curtainActive]);

  // Backup polling every 5s in case realtime drops
  useEffect(() => {
    if (curtainActive) return;
    const poll = setInterval(() => {
      fetchRequests();
      fetchOrders();
    }, 3000);
    return () => clearInterval(poll);
  }, [curtainActive]);

  // Elapsed time
  useEffect(() => {
    const update = () => {
      const times = [
        ...requests.filter(r => r.status === 'pending' && r.request_type !== 'kitchen_ready').map(r => new Date(r.created_at).getTime()),
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

  const pendingRequests = requests.filter(r => r.status === 'pending' && r.request_type !== 'kitchen_ready');
  const completedRequests = requests.filter(r => r.status === 'completed');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const handleDeleteFromHistory = async (id: string, type: 'request' | 'order') => {
    try {
      const action = type === 'request' ? 'delete_request' : 'delete_order';
      const { data, error } = await supabase.functions.invoke("manage-shift", {
        body: { action, id, token: shiftToken },
      });
      if (error || !data?.success) throw new Error("Failed");
      toast.success('U fshi nga historiku');
    } catch { toast.error('Gabim'); }
  };

  // ===== SONGS MANAGEMENT =====
  const fetchSongs = async () => {
    try {
      const { data } = await supabase
        .from("song_requests")
        .select("*")
        .in("status", ["pending", "approved"])
        .order("created_at", { ascending: true });
      if (data) {
        const songs = data as SongRequest[];
        setSongRequests(songs);
        const approved = songs.filter((s) => s.status === "approved");
        if (approved.length > 0 && !currentSongRef.current) {
          setCurrentSong(approved[0]);
          setPlaylist(approved.slice(1));
        } else if (currentSongRef.current) {
          setPlaylist(approved.filter((s) => s.id !== currentSongRef.current!.id));
        }
      }
    } catch (e) {
      console.error("Error fetching songs:", e);
    }
  };

  const handleApproveSong = async (id: string) => {
    try {
      await supabase.functions.invoke("manage-songs", { body: { action: "approve", id, shiftToken } });
      // Realtime UPDATE event do ta shtojë automatikisht në playlist
    } catch {
      toast.error("Gabim në miratim");
    }
  };

  const handleRejectSong = async (id: string) => {
    try {
      await supabase.functions.invoke("manage-songs", { body: { action: "reject", id, shiftToken } });
    } catch {
      toast.error("Gabim në refuzim");
    }
  };

  // ===== YOUTUBE PLAYER EVENTS (client-side queue + Radio fallback) =====
  const onPlayerEnd = () => {
    const ended = currentSongRef.current;
    if (ended) {
      lastVideoIdRef.current = ended.video_id;
      // Mark as played in DB (fire and forget — realtime will sync)
      supabase.functions
        .invoke("manage-songs", { body: { action: "played", id: ended.id, shiftToken } })
        .catch(() => {});
    }
    const queue = playlistRef.current;
    if (queue.length > 0) {
      const next = queue[0];
      setCurrentSong(next);
      setPlaylist(queue.slice(1));
    } else {
      setCurrentSong(null);
      if (lastVideoIdRef.current) setRadioMode(true);
    }
  };

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
    try { event.target.playVideo(); } catch {}
  };

  // Songs realtime + initial load (client-side queue management)
  useEffect(() => {
    if (curtainActive) return;

    fetchSongs();

    const channel = supabase
      .channel("songs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "song_requests" },
        (payload) => {
          const newSong = payload.new as SongRequest;
          setSongRequests((prev) => [...prev, newSong]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "song_requests" },
        (payload) => {
          const updated = payload.new as SongRequest;
          setSongRequests((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

          if (updated.status === "approved") {
            if (!currentSongRef.current) {
              // Kënga e parë e miratuar — bëje aktuale dhe dil nga Radio Mode
              setRadioMode(false);
              setCurrentSong(updated);
            } else {
              setPlaylist((prev) => (prev.some((s) => s.id === updated.id) ? prev : [...prev, updated]));
            }
          } else if (updated.status === "rejected" || updated.status === "played") {
            setPlaylist((prev) => prev.filter((s) => s.id !== updated.id));
            if (currentSongRef.current?.id === updated.id) {
              const queue = playlistRef.current;
              if (queue.length > 0) {
                setCurrentSong(queue[0]);
                setPlaylist(queue.slice(1));
              } else {
                setCurrentSong(null);
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "song_requests" },
        (payload) => {
          const old = payload.old as SongRequest;
          setSongRequests((prev) => prev.filter((s) => s.id !== old.id));
          setPlaylist((prev) => prev.filter((s) => s.id !== old.id));
          if (currentSongRef.current?.id === old.id) {
            const queue = playlistRef.current.filter((s) => s.id !== old.id);
            if (queue.length > 0) {
              setCurrentSong(queue[0]);
              setPlaylist(queue.slice(1));
            } else {
              setCurrentSong(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [curtainActive]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Duke verifikuar akses…
      </div>
    );
  }

  const btnMap: Record<string, JSX.Element> = {
    voice: (
      <Button variant={notificationType === 'voice' ? 'default' : 'outline'} size="sm"
        onClick={() => handleNotificationTypeChange('voice')} style={btnStyle} className="gap-1.5 touch-manipulation">
        <Volume2 className="h-4 w-4" /><span className="font-semibold">Zë</span>
      </Button>
    ),
    sound: (
      <Button variant={notificationType === 'sound' ? 'default' : 'outline'} size="sm"
        onClick={() => handleNotificationTypeChange('sound')} style={btnStyle} className="gap-1.5 touch-manipulation">
        <Bell className="h-4 w-4" /><span className="font-semibold">Tingull</span>
      </Button>
    ),
    test: (
      <Button variant="outline" size="sm"
        onClick={() => { enableAudio(); playBellSound(); }}
        style={btnStyle} className="gap-1.5 touch-manipulation bg-success/20 border-success/40 hover:bg-success/30">
        <Volume2 className="h-4 w-4 text-success" /><span className="font-bold text-success">TEST</span>
      </Button>
    ),
    qr: (
      <Button variant="outline" size="sm"
        onClick={() => setCurtainActive(true)}
        style={btnStyle} className="gap-1.5 touch-manipulation bg-primary/20 border-primary/40 hover:bg-primary/30">
        <QrCode className="h-4 w-4 text-primary" /><span className="font-bold text-primary">QR</span>
      </Button>
    ),
    arka: (
      <Button variant="outline" size="sm"
        onClick={() => setActiveTab('cashier')}
        style={btnStyle}
        className={`gap-1.5 touch-manipulation font-bold ${activeTab === 'cashier' ? 'bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90' : 'text-secondary border-secondary/40 hover:bg-secondary/20'}`}>
        <Receipt className={`h-4 w-4 ${activeTab === 'cashier' ? 'text-secondary-foreground' : 'text-secondary'}`} /><span>Arka</span>
      </Button>
    ),
    ready: (
      <Button variant="outline" size="sm"
        onClick={async () => {
          const { error } = await supabase.from('service_requests').insert({
            table_number: 'Banaku',
            request_type: 'kitchen_ready',
            status: 'pending',
          });
          if (error) toast.error('Gabim në dërgim');
          else toast.success('🔔 Thirrja u dërgua te kamarieri!');
        }}
        style={btnStyle} className="gap-1.5 touch-manipulation bg-accent border-accent/40 hover:bg-accent/80 animate-none">
        <UtensilsCrossed className="h-4 w-4 text-accent-foreground" /><span className="font-bold text-accent-foreground">Porosia Gati 🔔</span>
      </Button>
    ),
    mute: (
      <Button variant="outline" size="sm"
        onClick={() => {
          setMuteNotifications((m) => !m);
          toast.info(muteNotifications ? "🔊 Njoftimet u aktivizuan" : "🔇 Njoftimet u çaktivizuan");
        }}
        style={btnStyle}
        className={`gap-1.5 touch-manipulation ${muteNotifications ? 'bg-destructive/20 border-destructive/40 hover:bg-destructive/30' : ''}`}>
        {muteNotifications ? <VolumeX className="h-4 w-4 text-destructive" /> : <Volume2 className="h-4 w-4" />}
        <span className="font-bold">{muteNotifications ? 'MUTE' : 'Mute'}</span>
      </Button>
    ),
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-3 flex flex-col relative"
      style={{ zoom: layout.zoom / 100 } as React.CSSProperties}
      onClick={enableAudio}
    >
      <audio ref={audioRef} />

      {/* ===== QR CURTAIN OVERLAY ===== */}
      {curtainActive && <QRCurtain staffUrl={staffUrl} />}

      {/* ===== DASHBOARD CONTENT (always rendered) ===== */}
      <div className="mx-auto space-y-3 flex-1 w-full" style={{ maxWidth: `${layout.maxWidth}px` }}>
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

        {/* Top Control Bar — notification + Arka grouped above KDS/Arka space */}
        <Card className="p-3 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-secondary" />
              <span className="font-semibold text-sm">Njoftim</span>
              <Button
                variant={reorderMode ? "default" : "ghost"}
                size="sm"
                onClick={() => setReorderMode((v) => !v)}
                className="h-7 px-2 gap-1 text-xs ml-1"
                title="Zhvendos butonat"
              >
                {reorderMode ? <Lock className="h-3 w-3" /> : <GripVertical className="h-3 w-3" />}
                {reorderMode ? "Mbaro" : "Rendit"}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" title="Dimensionet">
                    <Settings2 className="h-3 w-3" /> Dimensionet
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-4" align="start">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Dimensionet e dashboard</h4>
                    <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                      onClick={() => setLayout(DEFAULT_LAYOUT)} title="Rikthe">
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                  {[
                    { k: "zoom" as const, label: "Zoom global", min: 60, max: 160, step: 5, suffix: "%" },
                    { k: "maxWidth" as const, label: "Gjerësia max", min: 900, max: 2400, step: 20, suffix: "px" },
                    { k: "btnHeight" as const, label: "Lartësia e butonave", min: 28, max: 72, step: 2, suffix: "px" },
                    { k: "btnFont" as const, label: "Teksti i butonave", min: 10, max: 22, step: 1, suffix: "px" },
                    { k: "bannerPadY" as const, label: "Baner — hapësira", min: 4, max: 40, step: 2, suffix: "px" },
                    { k: "bannerFont" as const, label: "Baner — teksti", min: 12, max: 32, step: 1, suffix: "px" },
                  ].map(({ k, label, min, max, step, suffix }) => (
                    <div key={k} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-semibold">{layout[k]}{suffix}</span>
                      </div>
                      <Slider min={min} max={max} step={step} value={[layout[k]]}
                        onValueChange={([v]) => setL(k, v)} />
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {(() => {
                return btnOrder.filter((k) => !detached[k]).map((key) => {
                  const el = btnMap[key];
                  if (!el) return null;
                  return (
                    <div
                      key={key}
                      draggable={reorderMode}
                      onDragStart={(e) => {
                        if (!reorderMode) return;
                        dragKeyRef.current = key;
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        if (!reorderMode) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        if (!reorderMode) return;
                        e.preventDefault();
                        const from = dragKeyRef.current;
                        if (from) moveBtn(from, key);
                        dragKeyRef.current = null;
                      }}
                      className={reorderMode ? "relative cursor-move ring-2 ring-primary/40 rounded-lg animate-pulse-slow" : ""}
                    >
                      {reorderMode && (
                        <>
                          <div className="absolute -top-2 -left-2 z-10 bg-primary text-primary-foreground rounded-full p-0.5 shadow">
                            <GripVertical className="h-3 w-3" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); detachBtn(key); }}
                            title="Nxirr jashtë banerit"
                            className="absolute -top-2 -right-2 z-20 bg-secondary text-secondary-foreground rounded-full p-1 shadow hover:scale-110 transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </>
                      )}
                      <div className={reorderMode ? "pointer-events-none" : ""}>{el}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </Card>

        {/* ===== YOUTUBE PLAYER (always mounted to persist playback; visible only in "Këngët" tab) ===== */}
        {(currentSong || (radioMode && lastVideoIdRef.current)) && (
          <Card className={`p-4 bg-card/50 ${activeTab === "songs" ? "block" : "hidden"}`}>
            <div className="aspect-video w-full max-w-3xl mx-auto rounded-xl overflow-hidden bg-black">
              {currentSong ? (
                <YouTube
                  key={`song-${currentSong.id}`}
                  videoId={currentSong.video_id}
                  opts={{
                    width: "100%",
                    height: "100%",
                    playerVars: { autoplay: 1, controls: 1, rel: 0 },
                  }}
                  className="w-full h-full"
                  iframeClassName="w-full h-full"
                  onReady={onPlayerReady}
                  onEnd={onPlayerEnd}
                />
              ) : (
                <YouTube
                  key={`radio-${lastVideoIdRef.current}`}
                  videoId={lastVideoIdRef.current!}
                  opts={{
                    width: "100%",
                    height: "100%",
                    playerVars: {
                      autoplay: 1,
                      controls: 1,
                      rel: 0,
                      list: `RD${lastVideoIdRef.current}`,
                      listType: "playlist",
                    },
                  }}
                  className="w-full h-full"
                  iframeClassName="w-full h-full"
                  onReady={onPlayerReady}
                />
              )}
            </div>
            <div className="mt-3 text-center">
              {currentSong ? (
                <>
                  <p className="font-bold text-base">{currentSong.title}</p>
                  <p className="text-xs text-muted-foreground">Tavolina {currentSong.table_number}</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-base">📻 Radio Mode</p>
                  <p className="text-xs text-muted-foreground">Muzikë e ngjashme automatike — do të ndërpritet kur miratohet një kërkesë e re</p>
                </>
              )}
            </div>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          {(() => {
            const reqCount = pendingRequests.length + pendingOrders.length;
            const songCount = songRequests.filter((s) => s.status === "pending").length;
            const total = barPending + kitchenPending + reqCount + songCount;
            if (total === 0 || muteNotifications) return null;
            const parts: string[] = [];
            if (reqCount > 0) parts.push(`Thirrje (${reqCount})`);
            if (barPending > 0) parts.push(`Bar (${barPending})`);
            if (kitchenPending > 0) parts.push(`Kuzhina (${kitchenPending})`);
            if (songCount > 0) parts.push(`Këngë (${songCount})`);
            return (
              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    reqCount > 0 ? "requests" : barPending > 0 ? "bar" : kitchenPending > 0 ? "kitchen" : "songs"
                  )
                }
                style={{ paddingTop: `${layout.bannerPadY}px`, paddingBottom: `${layout.bannerPadY}px`, fontSize: `${layout.bannerFont}px` }}
                className="w-full mb-3 rounded-lg px-4 bg-gradient-to-r from-[hsl(38,62%,68%)] via-[hsl(38,80%,52%)] to-[hsl(38,62%,68%)] text-[hsl(25,40%,12%)] font-black animate-pulse shadow-[0_0_25px_rgba(244,196,48,0.6)] ring-2 ring-[hsl(38,62%,68%)] flex items-center justify-center gap-3 hover:brightness-110 transition-all"
              >
                <Bell className="h-6 w-6 fill-current" />
                <span>🔔 POROSI E RE — {parts.join(" • ")}</span>
              </button>
            );
          })()}
          <TabsList className="grid w-full grid-cols-4 mb-4 gap-2 h-16 p-1.5">
            {(() => {
              const goldPulse = "bg-gradient-to-r !from-[hsl(38,62%,68%)] !via-[hsl(38,80%,52%)] !to-[hsl(38,62%,68%)] !text-[hsl(25,40%,12%)] font-black animate-pulse shadow-[0_0_25px_rgba(244,196,48,0.6)] ring-2 ring-[hsl(38,62%,68%)] hover:brightness-110 transition-all";
              const reqCount = pendingRequests.length + pendingOrders.length;
              const songCount = songRequests.filter((s) => s.status === "pending").length;
              return (
                <>
                  <TabsTrigger
                    value="requests"
                    className={`h-full text-base font-semibold px-2 gap-2 ${activeTab !== "requests" && reqCount > 0 ? goldPulse : ""}`}
                  >
                    📋 Thirrje
                    {activeTab !== "requests" && reqCount > 0 && (
                      <span className="ml-1">({reqCount})</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="bar"
                    className={`h-full text-base font-semibold px-2 gap-2 ${activeTab !== "bar" && barPending > 0 ? goldPulse : ""}`}
                  >
                    🍹 Bar{activeTab !== "bar" && barPending > 0 ? ` (${barPending})` : ""}
                  </TabsTrigger>
                  <TabsTrigger
                    value="kitchen"
                    className={`h-full text-base font-semibold px-2 gap-2 ${activeTab !== "kitchen" && kitchenPending > 0 ? goldPulse : ""}`}
                  >
                    🍽️ Kuzhina{activeTab !== "kitchen" && kitchenPending > 0 ? ` (${kitchenPending})` : ""}
                  </TabsTrigger>
                  <TabsTrigger
                    value="songs"
                    className={`h-full text-base font-semibold px-2 gap-2 ${activeTab !== "songs" && songCount > 0 ? goldPulse : ""}`}
                  >
                    🎵 Këngët {activeTab !== "songs" && songCount > 0 ? `(${songCount})` : `(${songCount})`}
                  </TabsTrigger>
                </>
              );
            })()}
          </TabsList>

          <TabsContent value="requests">
            <RequestsOrdersPanel
              pendingRequests={pendingRequests}
              pendingOrders={pendingOrders}
              completedRequests={completedRequests}
              completedOrders={completedOrders}
              handleComplete={handleComplete}
              handleCancel={handleCancel}
              handleCompleteOrder={handleCompleteOrder}
              handleCancelOrder={handleCancelOrder}
              handleDeleteFromHistory={handleDeleteFromHistory}
            />
          </TabsContent>

          <TabsContent value="songs">
            <SongsPanel
              songRequests={songRequests}
              playlist={playlist}
              hasCurrentSong={!!currentSong}
              radioMode={radioMode}
              handleApproveSong={handleApproveSong}
              handleRejectSong={handleRejectSong}
            />
          </TabsContent>

          <TabsContent value="bar">
            <KDSPanel kind="bar" />
          </TabsContent>
          <TabsContent value="kitchen">
            <KDSPanel kind="kitchen" />
          </TabsContent>
          <TabsContent value="cashier">
            <CashierPanel />
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">Boulevard Café Elbasan • WhatsApp: +355 67 401 0030</p>
        </div>
      </div>

      {/* ===== FLOATING (DETACHED) BUTTONS ===== */}
      {Object.entries(detached).map(([key, pos]) => {
        const el = btnMap[key];
        if (!el) return null;
        return (
          <div
            key={`float-${key}`}
            style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 50 }}
            className={`select-none ${reorderMode ? "ring-2 ring-primary/60 rounded-lg shadow-lg" : "shadow-md rounded-lg"}`}
          >
            {reorderMode && (
              <>
                <button
                  type="button"
                  onPointerDown={onFloatPointerDown(key)}
                  onPointerMove={onFloatPointerMove}
                  onPointerUp={onFloatPointerUp}
                  onPointerCancel={onFloatPointerUp}
                  title="Tërhiq për ta zhvendosur"
                  className="absolute -top-3 -left-3 z-30 bg-primary text-primary-foreground rounded-full p-1 shadow cursor-move touch-none"
                >
                  <Move className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => dockBtn(key)}
                  title="Rikthe në baner"
                  className="absolute -top-3 -right-3 z-30 bg-destructive text-destructive-foreground rounded-full p-1 shadow hover:scale-110 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <div className={reorderMode ? "pointer-events-none" : ""}>{el}</div>
          </div>
        );
      })}
    </div>
  );
};

export default Dashboard;
