import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface ServiceRequest {
  id: string;
  table_number: string;
  request_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const Dashboard = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const repeatCountRef = useRef<Map<string, number>>(new Map());

  const playAudioNotification = (requestType: string, tableNumber: string) => {
    try {
      const text = requestType === 'waiter' 
        ? `Tavolinë ${tableNumber} kërkon shërbim`
        : `Tavolinë ${tableNumber} kërkon faturën`;

      console.log('Playing audio notification:', text);

      // Use browser's Speech Synthesis API for immediate, reliable playback
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'sq-AL';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => console.log('Audio started playing');
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
      const { data, error } = await supabase
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

  const handleComplete = async (id: string) => {
    try {
      clearRepeatNotification(id);
      
      const { error } = await supabase
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
      
      const { error } = await supabase
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

  useEffect(() => {
    fetchRequests();

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

    return () => {
      supabase.removeChannel(channel);
      // Clear all timers on unmount
      repeatTimersRef.current.forEach(timer => clearTimeout(timer));
      repeatTimersRef.current.clear();
      repeatCountRef.current.clear();
    };
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed');

  const handleDeleteFromHistory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Kërkesa u fshi nga historiku');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Gabim në fshirjen e kërkesës');
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <p className="text-lg text-muted-foreground">Duke u ngarkuar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6 flex flex-col">
      <audio ref={audioRef} />
      
      <div className="max-w-7xl mx-auto space-y-6 flex-1">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Dashboard i Kamarierit</h1>
          <p className="text-muted-foreground">Universal Caffè - Menaxhimi i Kërkesave</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              Kërkesa Aktive ({pendingRequests.length})
            </h2>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nuk ka kërkesa aktive</p>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="p-4 bg-card/50 border-l-4 border-l-warning">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getRequestIcon(request.request_type)}
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{request.table_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.request_type === 'waiter' ? 'Kërkon kamarier' : 'Kërkon faturë'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(request.created_at).toLocaleTimeString('sq-AL')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleComplete(request.id)}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(request.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Historiku ({completedRequests.length})
            </h2>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {completedRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nuk ka historik</p>
              ) : (
                completedRequests.slice(0, 20).map((request) => (
                  <Card key={request.id} className="p-4 bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getRequestIcon(request.request_type)}
                        <div className="flex-1">
                          <p className="font-semibold">{request.table_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.request_type === 'waiter' ? 'Kamarier' : 'Faturë'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleTimeString('sq-AL')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFromHistory(request.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
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
