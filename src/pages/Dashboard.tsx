import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bell, Receipt, CheckCircle, X, UtensilsCrossed, Lock, Volume2, Flame, Clock } from "lucide-react";
import { toast } from "sonner";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [notificationType, setNotificationType] = useState<'voice' | 'sound'>('voice');
  const [heaterLoading, setHeaterLoading] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const repeatCountRef = useRef<Map<string, number>>(new Map());
  const audioEnabledRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const notificationTypeRef = useRef<'voice' | 'sound'>('voice');

  useEffect(() => {
    const sessionPassword = sessionStorage.getItem('dashboard_auth');
    if (sessionPassword === '2025') {
      setIsAuthenticated(true);
    }
    
    // Load notification preference from localStorage
    const savedNotificationType = localStorage.getItem('notification_type') as 'voice' | 'sound';
    if (savedNotificationType) {
      setNotificationType(savedNotificationType);
      notificationTypeRef.current = savedNotificationType;
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2025') {
      sessionStorage.setItem('dashboard_auth', '2025');
      setIsAuthenticated(true);
      toast.success('Qasje e lejuar');
    } else {
      toast.error('Fjalëkalim i gabuar');
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

  const enableAudio = () => {
    if (!audioEnabledRef.current && 'speechSynthesis' in window) {
      // Ensure an English voice is selected
      loadPreferredVoice();
      // Initialize speech synthesis with a silent utterance to unlock audio
      const utterance = new SpeechSynthesisUtterance(' ');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
      audioEnabledRef.current = true;
      console.log('Audio enabled');
      toast.success('Voice alerts enabled');
    }
  };

  const playBellSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a distinctive "ding dong" doorbell sound - completely different from voice
      const playDingDong = () => {
        // First "ding" - higher pitch
        const oscillator1 = audioContext.createOscillator();
        const gainNode1 = audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(1200, audioContext.currentTime);
        gainNode1.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.3);
        
        // Second "dong" - lower pitch, slightly delayed
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          
          oscillator2.frequency.setValueAtTime(900, audioContext.currentTime);
          gainNode2.gain.setValueAtTime(0.4, audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.4);
        }, 200);
      };
      
      // Play the ding-dong sound 3 times with delays
      playDingDong();
      setTimeout(() => playDingDong(), 1000);
      setTimeout(() => playDingDong(), 2000);
      
    } catch (error) {
      console.error('Error playing bell sound:', error);
    }
  };

  const playAudioNotification = (requestType: string, tableNumber: string) => {
    try {
      if (notificationTypeRef.current === 'sound') {
        console.log('Playing bell sound notification');
        playBellSound();
        return;
      }

      const text = requestType === 'waiter' 
        ? `Table ${tableNumber} requests service`
        : requestType === 'bill'
        ? `Table ${tableNumber} requests the bill`
        : `New order from table ${tableNumber}`;

      console.log('Playing voice notification:', text);

      // Use browser's Speech Synthesis API for immediate, reliable playback
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        // Prefer an English voice explicitly
        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
        } else if (window.speechSynthesis.getVoices) {
          const voices = window.speechSynthesis.getVoices();
          const fallback = voices.find(v => v.lang?.toLowerCase() === 'en-us') || voices.find(v => v.lang?.toLowerCase().startsWith('en'));
          if (fallback) utterance.voice = fallback;
        }
        
        utterance.onstart = () => console.log('Audio started playing:', text);
        utterance.onend = () => console.log('Audio finished playing');
        utterance.onerror = (e) => console.error('Speech synthesis error:', e);
        
        window.speechSynthesis.speak(utterance);
      } else {
        console.error('Speech synthesis not supported');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
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
          playAudioNotification(requestType, tableNumber);
          repeatCountRef.current.set(requestId, currentCount + 1);
          scheduleRepeatNotification(requestId, requestType, tableNumber);
        }
      }, 60000); // 60 seconds (1 minute)

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

  // Timer for elapsed time since first pending request + auto-refresh
  useEffect(() => {
    const updateElapsedTime = () => {
      const pendingRequests = requests.filter(r => r.status === 'pending');
      const pendingOrders = orders.filter(o => o.status === 'pending');
      
      const allPendingTimes = [
        ...pendingRequests.map(r => new Date(r.created_at).getTime()),
        ...pendingOrders.map(o => new Date(o.created_at).getTime())
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

  const handleTestHeater = async (tableNumber: string) => {
    setHeaterLoading(tableNumber);
    try {
      // Extract just the number from "Tavolina X"
      const tableNum = tableNumber.replace('Tavolina ', '');
      
      const { error } = await supabase.functions.invoke('control-heater', {
        body: { tableNumber: tableNum }
      });

      if (error) throw error;

      toast.success('Ngrohësja u ndez!', {
        description: `Ngrohësja për ${tableNumber} u aktivizua me sukses.`
      });
    } catch (error) {
      console.error('Error controlling heater:', error);
      toast.error('Gabim në ndezjen e ngrohëses', {
        description: 'Ju lutem provoni përsëri.'
      });
    } finally {
      setHeaterLoading(null);
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
            <h1 className="text-2xl font-bold">Dashboard i Mbrojtur</h1>
            <p className="text-muted-foreground">Vendosni fjalëkalimin për të vazhduar</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Fjalëkalimi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center text-lg"
              autoFocus
            />
            <Button type="submit" className="w-full" size="lg">
              Vazhdo
            </Button>
          </form>
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-secondary" />
              <span className="font-semibold text-xs">Njoftim</span>
            </div>
            <div className="flex gap-2">
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
            </div>
          </div>
        </Card>

        {/* Heater Testing Section */}
        <Card className="p-4 bg-card/50 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold">Testo Ngrohëset</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Tavolina 1', 'Tavolina 2', 'Tavolina 3', 'Tavolina 4'].map((table) => (
              <Button
                key={table}
                onClick={() => handleTestHeater(table)}
                disabled={heaterLoading === table}
                className="h-16 flex flex-col gap-1 touch-manipulation"
                variant="outline"
              >
                <Flame className={`h-5 w-5 ${heaterLoading === table ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-semibold">{table}</span>
              </Button>
            ))}
          </div>
        </Card>

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
