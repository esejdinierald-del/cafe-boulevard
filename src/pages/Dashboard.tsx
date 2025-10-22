import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bell, Receipt, CheckCircle, X, UtensilsCrossed, Lock } from "lucide-react";
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
}

const Dashboard = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const repeatCountRef = useRef<Map<string, number>>(new Map());
  const audioEnabledRef = useRef(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const sessionPassword = sessionStorage.getItem('dashboard_auth');
    if (sessionPassword === '2025') {
      setIsAuthenticated(true);
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

  const playAudioNotification = (requestType: string, tableNumber: string) => {
    try {
      const text = requestType === 'waiter' 
        ? `Table ${tableNumber} requests service`
        : requestType === 'bill'
        ? `Table ${tableNumber} requests the bill`
        : `New order from table ${tableNumber}`;

      console.log('Playing audio notification:', text);

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
    
    if (currentCount < 3) {
      const timer = setTimeout(() => {
        // Check if request is still pending
        const request = requests.find(r => r.id === requestId && r.status === 'pending');
        if (request) {
          playAudioNotification(requestType, tableNumber);
          repeatCountRef.current.set(requestId, currentCount + 1);
          scheduleRepeatNotification(requestId, requestType, tableNumber);
        }
      }, 30000); // 30 seconds

      repeatTimersRef.current.set(requestId, timer);
    } else {
      // Clean up after 3 repeats
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6 flex flex-col" onClick={enableAudio}>
      <audio ref={audioRef} />
      
      <div className="max-w-7xl mx-auto space-y-6 flex-1">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Dashboard i Kamarierit</h1>
          <p className="text-muted-foreground">Universal Caffè - Menaxhimi i Kërkesave</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Bell className="h-6 w-6 text-warning" />
              Kërkesa Aktive ({pendingRequests.length})
            </h2>
            
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-12 text-lg">Nuk ka kërkesa aktive</p>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="p-5 bg-card/50 border-l-4 border-l-warning">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getRequestIcon(request.request_type)}
                        <div className="flex-1">
                          <p className="font-bold text-xl">{request.table_number}</p>
                          <p className="text-base text-muted-foreground mt-1">
                            {request.request_type === 'waiter' ? 'Kërkon kamarier' : 'Kërkon faturë'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {new Date(request.created_at).toLocaleTimeString('sq-AL')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          onClick={() => handleComplete(request.id)}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </Button>
                        <Button
                          size="lg"
                          variant="destructive"
                          onClick={() => handleCancel(request.id)}
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

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              Porosi Aktive ({pendingOrders.length})
            </h2>
            
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {pendingOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-12 text-lg">Nuk ka porosi aktive</p>
              ) : (
                pendingOrders.map((order) => (
                  <Card key={order.id} className="p-5 bg-card/50 border-l-4 border-l-primary">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-xl">{order.table_number}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(order.created_at).toLocaleTimeString('sq-AL')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="lg"
                            onClick={() => handleCompleteOrder(order.id)}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </Button>
                          <Button
                            size="lg"
                            variant="destructive"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 border-t pt-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-base">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-semibold">{item.price * item.quantity} Lekë</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-lg border-t pt-3 mt-2">
                          <span>Totali:</span>
                          <span className="text-primary">{order.total_price} Lekë</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success" />
              Historiku ({completedRequests.length + completedOrders.length})
            </h2>
            
            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {completedRequests.length === 0 && completedOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-12 text-lg">Nuk ka historik</p>
              ) : (
                <>
                  {completedRequests.map((request) => (
                    <Card key={`req-${request.id}`} className="p-5 bg-muted/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getRequestIcon(request.request_type)}
                          <div className="flex-1">
                            <p className="font-bold text-lg">{request.table_number}</p>
                            <p className="text-base text-muted-foreground">
                              {request.request_type === 'waiter' ? 'Kamarier' : 'Faturë'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(request.created_at).toLocaleTimeString('sq-AL')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                          <Button
                            size="lg"
                            variant="ghost"
                            onClick={() => handleDeleteFromHistory(request.id, 'request')}
                            className="h-10 w-10 p-0"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {completedOrders.map((order) => (
                    <Card key={`ord-${order.id}`} className="p-5 bg-muted/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <UtensilsCrossed className="h-5 w-5" />
                          <div className="flex-1">
                            <p className="font-bold text-lg">{order.table_number}</p>
                            <p className="text-base text-muted-foreground">Porosi</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(order.created_at).toLocaleTimeString('sq-AL')}
                            </p>
                            <p className="text-sm font-semibold mt-2">
                              Totali: {order.total_price} Lekë
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          <Button
                            size="lg"
                            variant="ghost"
                            onClick={() => handleDeleteFromHistory(order.id, 'order')}
                            className="h-10 w-10 p-0"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer with expiration notice */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <p className="text-sm text-muted-foreground font-medium">
            Faqja do të jetë aktive deri <span className="text-foreground font-semibold">Dhjetor 2026</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Për info:{" "}
            <a 
              href="https://wa.me/355674010030" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-success hover:text-success/80 font-medium underline transition-colors"
            >
              WhatsApp +355 67 401 0030
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
