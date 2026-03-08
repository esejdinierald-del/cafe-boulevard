import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, CheckCircle, X, UtensilsCrossed, Lock, Volume2, Clock, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [notificationType, setNotificationType] = useState<'voice' | 'sound'>('voice');
  
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const repeatTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const repeatCountRef = useRef<Map<string, number>>(new Map());
  const audioEnabledRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const notificationTypeRef = useRef<'voice' | 'sound'>('voice');
  const titleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalTitleRef = useRef<string>('Boulevard Staff');
  const [shiftToken, setShiftToken] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);

  const generateShiftToken = async () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine current shift boundaries
    let shiftStart: Date, shiftEnd: Date;
    if (hour >= 3 && hour < 15) {
      // Morning shift: 03:00 - 15:00
      shiftStart = new Date(now);
      shiftStart.setHours(3, 0, 0, 0);
      shiftEnd = new Date(now);
      shiftEnd.setHours(15, 0, 0, 0);
    } else {
      // Evening shift: 15:00 - 03:00 next day
      shiftStart = new Date(now);
      if (hour >= 15) {
        shiftStart.setHours(15, 0, 0, 0);
        shiftEnd = new Date(now);
        shiftEnd.setDate(shiftEnd.getDate() + 1);
        shiftEnd.setHours(3, 0, 0, 0);
      } else {
        // 00:00 - 02:59: shift started yesterday at 15:00
        shiftStart.setDate(shiftStart.getDate() - 1);
        shiftStart.setHours(15, 0, 0, 0);
        shiftEnd = new Date(now);
        shiftEnd.setHours(3, 0, 0, 0);
      }
    }

    // Check for existing token for this shift
    const { data: existing } = await supabase
      .from("shift_tokens")
      .select("token")
      .gte("shift_end", new Date().toISOString())
      .lte("shift_start", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      setShiftToken(existing.token);
      setShowQrDialog(true);
      return;
    }

    // Generate new token
    const token = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
    const { error } = await supabase.from("shift_tokens").insert({
      token,
      shift_start: shiftStart.toISOString(),
      shift_end: shiftEnd.toISOString(),
    });

    if (error) {
      toast.error("Gabim gjatë gjenerimit të QR");
      return;
    }
    setShiftToken(token);
    setShowQrDialog(true);
    toast.success("QR kodi u gjenerua me sukses!");
  };

  const staffUrl = shiftToken ? `${window.location.origin}/staff?token=${shiftToken}` : "";

  // Visual notification - flashing tab title with pending count
  useEffect(() => {
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalPending = pendingRequests + pendingOrders;

    // Clear existing interval
    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }

    if (totalPending > 0 && isAuthenticated) {
      let isAlternate = false;
      
      // Flash title between count and alert
      titleIntervalRef.current = setInterval(() => {
        if (isAlternate) {
          document.title = `🔔 ${totalPending} në pritje!`;
        } else {
          document.title = `⚠️ KËRKESË E RE!`;
        }
        isAlternate = !isAlternate;
      }, 1000);
    } else {
      document.title = originalTitleRef.current;
    }

    return () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
      }
      document.title = originalTitleRef.current;
    };
  }, [requests, orders, isAuthenticated]);

  // Simple password check
  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard_auth');
    if (saved === 'true') {
      setIsAuthenticated(true);
    }

    // Load notification preference from localStorage
    const savedNotificationType = localStorage.getItem('notification_type') as 'voice' | 'sound';
    if (savedNotificationType) {
      setNotificationType(savedNotificationType);
      notificationTypeRef.current = savedNotificationType;
    }
  }, []);

  const handlePasswordSubmit = () => {
    if (passwordInput === '2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('dashboard_auth', 'true');
    } else {
      toast.error('Fjalëkalimi i gabuar');
    }
  };

  const loadPreferredVoice = () => {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const enUs = voices.find(v => v.lang?.toLowerCase() === 'en-us');
    const enGeneric = voices.find(v => v.lang?.toLowerCase().startsWith('en'));
    selectedVoiceRef.current = enUs || enGeneric || null;
    if (selectedVoiceRef.current) {
      console.log('Selected voice:', selectedVoiceRef.current.name, selectedVoiceRef.current.lang);
    } else {
      console.warn('No English voice found, using default.');
    }
  };

  // Ensure voices are loaded and selected
  if ('speechSynthesis' in window) {
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadPreferredVoice();
      };
    } else {
      loadPreferredVoice();
    }
  }

  // Request permission for system notifications
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission === 'granted';
    }
    return false;
  };

  // Show system notification (works even when browser is minimized)
  const showSystemNotification = (title: string, body: string, requestType: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `${requestType}-${Date.now()}`,
        requireInteraction: true, // Keeps notification visible until user interacts
      });

      // When notification is clicked, focus the window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const enableAudio = async () => {
    console.log('enableAudio called');
    try {
      // Initialize shared AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed');
      }
      
      // Enable speech synthesis
      if (!audioEnabledRef.current && 'speechSynthesis' in window) {
        loadPreferredVoice();
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        audioEnabledRef.current = true;
        console.log('Speech synthesis enabled');
      }
      
      // Request notification permission
      const notificationGranted = await requestNotificationPermission();
      
      if (notificationGranted) {
        toast.success('Audio dhe njoftimet aktivizuar!');
      } else {
        toast.success('Audio aktivizuar!', {
          description: 'Lejo njoftimet për të marrë alert kur dritarja është e minimizuar'
        });
      }
    } catch (error) {
      console.error('Error enabling audio:', error);
    }
  };

  const playBellSound = async () => {
    console.log('playBellSound called');
    try {
      // Use shared AudioContext or create new one
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext resumed in playBellSound');
      }
      
      // Create a distinctive "ding dong" doorbell sound
      const playDingDong = () => {
        const currentTime = audioContext.currentTime;
        
        // First "ding" - higher pitch
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(1200, currentTime);
        gainNode1.gain.setValueAtTime(0.6, currentTime);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);
        
        oscillator1.start(currentTime);
        oscillator1.stop(currentTime + 0.3);
        
        // Second "dong" - lower pitch, slightly delayed
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.setValueAtTime(900, currentTime + 0.25);
        gainNode2.gain.setValueAtTime(0.001, currentTime);
        gainNode2.gain.setValueAtTime(0.6, currentTime + 0.25);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.65);
        
        oscillator2.start(currentTime + 0.25);
        oscillator2.stop(currentTime + 0.65);
      };
      
      // Play the ding-dong sound 3 times with delays
      playDingDong();
      setTimeout(() => playDingDong(), 1000);
      setTimeout(() => playDingDong(), 2000);
      
      console.log('Bell sound played successfully');
    } catch (error) {
      console.error('Error playing bell sound:', error);
    }
  };

  const playAudioNotification = (requestType: string, tableNumber: string, isReminder: boolean = false) => {
    console.log('playAudioNotification called:', { requestType, tableNumber, notificationType: notificationTypeRef.current });
    
    // Always play bell sound first as backup (works without user gesture on many browsers)
    playBellSound();
    
    // Show system notification (works when browser is minimized)
    const notificationTitle = isReminder 
      ? `⏰ Rikujtim - ${tableNumber}`
      : `🔔 Kërkesë e re - ${tableNumber}`;
    
    const notificationBody = requestType === 'waiter' 
      ? 'Kërkon kamarier'
      : requestType === 'bill'
      ? 'Kërkon faturën'
      : 'Porosi e re';
    
    showSystemNotification(notificationTitle, notificationBody, requestType);
    
    try {
      // If voice mode, also try to speak
      if (notificationTypeRef.current === 'voice') {
        const text = requestType === 'waiter' 
          ? `Table ${tableNumber} requests service`
          : requestType === 'bill'
          ? `Table ${tableNumber} requests the bill`
          : `New order from table ${tableNumber}`;

        console.log('Also playing voice notification:', text);

        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          if (selectedVoiceRef.current) {
            utterance.voice = selectedVoiceRef.current;
          } else if (window.speechSynthesis.getVoices) {
            const voices = window.speechSynthesis.getVoices();
            const fallback = voices.find(v => v.lang?.toLowerCase() === 'en-us') || voices.find(v => v.lang?.toLowerCase().startsWith('en'));
            if (fallback) utterance.voice = fallback;
          }
          
          utterance.onstart = () => console.log('Voice started:', text);
          utterance.onend = () => console.log('Voice finished');
          utterance.onerror = (e) => console.error('Speech synthesis error:', e);
          
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error('Error playing audio notification:', error);
    }
  };

  const scheduleRepeatNotification = (requestId: string, requestType: string, tableNumber: string) => {
    // Clear any existing timer for this request
    const existingTimer = repeatTimersRef.current.get(requestId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Initialize repeat count for this request
    const currentCount = repeatCountRef.current.get(requestId) || 0;
    
    if (currentCount < 5) {
      const timer = setTimeout(() => {
        // Check if request/order is still pending
        const request = requests.find(r => r.id === requestId && r.status === 'pending');
        const order = orders.find(o => o.id === requestId && o.status === 'pending');
        
        if (request || order) {
          console.log(`Reminder #${currentCount + 1} for ${requestType} at table ${tableNumber}`);
          playAudioNotification(requestType, tableNumber, true); // isReminder = true
          toast.warning(`⏰ Rikujtim! ${tableNumber} pret ende`, {
            description: requestType === 'waiter' ? 'Kamarier' : requestType === 'bill' ? 'Faturë' : 'Porosi'
          });
          repeatCountRef.current.set(requestId, currentCount + 1);
          scheduleRepeatNotification(requestId, requestType, tableNumber);
        }
      }, 180000); // 180 seconds (3 minutes)

      repeatTimersRef.current.set(requestId, timer);
    } else {
      // Clean up after 5 repeats
      repeatCountRef.current.delete(requestId);
      repeatTimersRef.current.delete(requestId);
    }
  };

  const clearRepeatNotification = (requestId: string) => {
    const timer = repeatTimersRef.current.get(requestId);
    if (timer) {
      clearTimeout(timer);
      repeatTimersRef.current.delete(requestId);
    }
    repeatCountRef.current.delete(requestId);
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Gabim në marrjen e kërkesave');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Gabim në marrjen e porosive');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      clearRepeatNotification(id);
      
      const { error } = await (supabase as any)
        .from('service_requests')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Kërkesa u përmbyll');
    } catch (error) {
      console.error('Error completing request:', error);
      toast.error('Gabim në përmbylljen e kërkesës');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      clearRepeatNotification(id);
      
      const { error } = await (supabase as any)
        .from('service_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Kërkesa u anulua');
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Gabim në anulimin e kërkesës');
    }
  };

  const handleCompleteOrder = async (id: string) => {
    try {
      clearRepeatNotification(id);
      
      const { error } = await (supabase as any)
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Porosia u përmbyll');
    } catch (error) {
      console.error('Error completing order:', error);
      toast.error('Gabim në përmbylljen e porosisë');
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
      clearRepeatNotification(id);
      
      const { error } = await (supabase as any)
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Porosia u anulua');
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Gabim në anulimin e porosisë');
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchOrders();

    const channel = supabase
      .channel('service-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests'
        },
        (payload) => {
          const newRequest = payload.new as ServiceRequest;
          setRequests(prev => [newRequest, ...prev]);
          
          playAudioNotification(newRequest.request_type, newRequest.table_number);
          scheduleRepeatNotification(newRequest.id, newRequest.request_type, newRequest.table_number);
          
          toast.success('Kërkesë e re!', {
            description: `${newRequest.table_number} - ${
              newRequest.request_type === 'waiter' ? 'Kamarier' : 'Faturë'
            }`
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests'
        },
        (payload) => {
          const updatedRequest = payload.new as ServiceRequest;
          setRequests(prev =>
            prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
          );
          
          // Clear repeat timer if status changed from pending
          if (updatedRequest.status !== 'pending') {
            clearRepeatNotification(updatedRequest.id);
          }
        }
      )
      .subscribe();

    // Subscribe to orders
    const ordersChannel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders(prev => [newOrder, ...prev]);
          
          playAudioNotification('order', newOrder.table_number);
          scheduleRepeatNotification(newOrder.id, 'order', newOrder.table_number);
          
          toast.success('Porosi e re!', {
            description: `${newOrder.table_number} - ${newOrder.items.length} artikuj`
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrders(prev =>
            prev.map(order => order.id === updatedOrder.id ? updatedOrder : order)
          );
          
          // Clear repeat timer if status changed from pending
          if (updatedOrder.status !== 'pending') {
            clearRepeatNotification(updatedOrder.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const deletedOrder = payload.old as Order;
          setOrders(prev => prev.filter(order => order.id !== deletedOrder.id));
        }
      )
      .subscribe();

    // Listen for DELETE events on service_requests
    const deleteChannel = supabase
      .channel('service-requests-delete')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'service_requests'
        },
        (payload) => {
          const deletedRequest = payload.old as ServiceRequest;
          setRequests(prev => prev.filter(req => req.id !== deletedRequest.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(deleteChannel);
      // Clear all timers on unmount
      repeatTimersRef.current.forEach(timer => clearTimeout(timer));
      repeatTimersRef.current.clear();
      repeatCountRef.current.clear();
    };
  }, []);

  // Auto-refresh polling every 5 seconds as backup for realtime
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const pollInterval = setInterval(() => {
      fetchRequests();
      fetchOrders();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isAuthenticated]);

  // Timer for elapsed time since first pending request
  useEffect(() => {
    const updateElapsedTime = () => {
      const pendingRequestsList = requests.filter(r => r.status === 'pending');
      const pendingOrdersList = orders.filter(o => o.status === 'pending');
      
      const allPendingTimes = [
        ...pendingRequestsList.map(r => new Date(r.created_at).getTime()),
        ...pendingOrdersList.map(o => new Date(o.created_at).getTime())
      ];
      
      if (allPendingTimes.length === 0) {
        setElapsedTime('');
        return;
      }
      
      const oldestTime = Math.min(...allPendingTimes);
      const now = Date.now();
      const diffMs = now - oldestTime;
      
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      
      if (minutes > 0) {
        setElapsedTime(`${minutes}m ${seconds}s`);
      } else {
        setElapsedTime(`${seconds}s`);
      }
    };

    updateElapsedTime();
    const timer = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(timer);
  }, [requests, orders]);

  const handleNotificationTypeChange = (type: 'voice' | 'sound') => {
    setNotificationType(type);
    notificationTypeRef.current = type;
    localStorage.setItem('notification_type', type);
    
    // Play test sound/voice when button is clicked
    if (type === 'sound') {
      playBellSound();
      toast.success('Njoftimet me tingull aktivizuar');
    } else {
      // Play test voice message
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Voice notifications enabled');
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
        }
        window.speechSynthesis.speak(utterance);
      }
      toast.success('Njoftimet zanore aktivizuar');
    }
  };


  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const handleDeleteFromHistory = async (id: string, type: 'request' | 'order') => {
    try {
      const table = type === 'request' ? 'service_requests' : 'orders';
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(type === 'request' ? 'Kërkesa u fshi nga historiku' : 'Porosia u fshi nga historiku');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Gabim në fshirjen');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Në pritje</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Përfunduar</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Anuluar</Badge>;
      default:
        return null;
    }
  };

  const getRequestIcon = (type: string) => {
    return type === 'waiter' ? <Bell className="h-5 w-5" /> : <Receipt className="h-5 w-5" />;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-2">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Dashboard i Stafit</h1>
            <p className="text-muted-foreground">Vendosni fjalëkalimin për të hyrë</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Fjalëkalimi"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <Button onClick={handlePasswordSubmit} className="w-full" size="lg">
              Hyr
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <p className="text-lg text-muted-foreground">Duke u ngarkuar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-3 flex flex-col" onClick={enableAudio}>
      <audio ref={audioRef} />
      
      <div className="max-w-7xl mx-auto space-y-3 flex-1 w-full">
        <div className="text-center space-y-1 relative">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            {(pendingRequests.length > 0 || pendingOrders.length > 0) && (
              <div className="flex items-center gap-2 animate-pulse-glow rounded-full px-3 py-1 bg-warning/20">
                <Bell className="h-4 w-4 text-warning animate-bounce-soft" />
                <span className="font-bold text-warning text-sm">
                  {pendingRequests.length + pendingOrders.length}
                </span>
              </div>
            )}
            {elapsedTime && (
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-destructive/20 border border-destructive/30">
                <Clock className="h-4 w-4 text-destructive" />
                <span className="font-mono font-bold text-destructive text-sm">
                  {elapsedTime}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Boulevard Café Elbasan</p>
        </div>

        {/* Notification Settings - Compact */}
        <Card className="p-3 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-secondary" />
              <span className="font-semibold text-xs">Njoftim</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={notificationType === 'voice' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleNotificationTypeChange('voice')}
                className="gap-1.5 h-9 px-3 touch-manipulation"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span className="text-xs">Zë</span>
              </Button>
              <Button
                variant={notificationType === 'sound' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleNotificationTypeChange('sound')}
                className="gap-1.5 h-9 px-3 touch-manipulation"
              >
                <Bell className="h-3.5 w-3.5" />
                <span className="text-xs">Tingull</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  enableAudio();
                  playBellSound();
                }}
                className="gap-1.5 h-9 px-3 touch-manipulation bg-success/20 border-success/40 hover:bg-success/30"
              >
                <Volume2 className="h-3.5 w-3.5 text-success" />
                <span className="text-xs font-bold text-success">TEST</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateShiftToken}
                className="gap-1.5 h-9 px-3 touch-manipulation bg-primary/20 border-primary/40 hover:bg-primary/30"
              >
                <QrCode className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">QR</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* QR Code Dialog */}
        <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">QR Kodi i Turnit</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {staffUrl && (
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={staffUrl} size={200} />
                </div>
              )}
              <p className="text-sm text-muted-foreground text-center">
                Kamarierët e skanojnë këtë kod me telefon për të marrë njoftimet e turnit.
              </p>
              <p className="text-xs text-muted-foreground text-center">
                Kodi skadon automatikisht në fund të turnit.
              </p>
            </div>
          </DialogContent>
        </Dialog>


        <div className="grid gap-3 grid-cols-3">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              <span>Kërkesa ({pendingRequests.length})</span>
            </h2>
            
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nuk ka kërkesa</p>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="p-3 bg-card/50 border-l-4 border-l-warning touch-manipulation">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getRequestIcon(request.request_type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg truncate">{request.table_number}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {request.request_type === 'waiter' ? 'Kamarier' : 'Faturë'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => handleComplete(request.id)}
                          className="bg-success hover:bg-success/90 h-12 w-12 p-0 touch-manipulation"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(request.id)}
                          className="h-12 w-12 p-0 touch-manipulation"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              <span>Porosi ({pendingOrders.length})</span>
            </h2>
            
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {pendingOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Nuk ka porosi</p>
              ) : (
                pendingOrders.map((order) => (
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
                          <Button
                            size="sm"
                            onClick={() => handleCompleteOrder(order.id)}
                            className="bg-success hover:bg-success/90 h-12 w-12 p-0 touch-manipulation"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelOrder(order.id)}
                            className="h-12 w-12 p-0 touch-manipulation"
                          >
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
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Historiku ({completedRequests.length + completedOrders.length})</span>
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
                            <p className="text-xs text-muted-foreground truncate">
                              {request.request_type === 'waiter' ? 'Kamarier' : 'Faturë'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFromHistory(request.id, 'request')}
                          className="h-8 w-8 p-0 touch-manipulation"
                        >
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
                            {order.notes && (
                              <p className="text-xs bg-muted/50 p-1.5 rounded mt-1 italic">
                                {order.notes}
                              </p>
                            )}
                            <p className="text-xs font-semibold mt-0.5">
                              {order.total_price.toLocaleString()} L
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFromHistory(order.id, 'order')}
                          className="h-8 w-8 p-0 touch-manipulation"
                        >
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

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            Aktive deri Dhjetor 2026 • WhatsApp: +355 67 401 0030
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
