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

  const playAudioNotification = async (requestType: string, tableNumber: string) => {
    try {
      const text = requestType === 'waiter' 
        ? `Klient në tavolinën ${tableNumber} kërkon shërbim`
        : `Klient në tavolinën ${tableNumber} kërkon faturën`;

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed');

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <audio ref={audioRef} />
      
      <div className="max-w-7xl mx-auto space-y-6">
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
                      {getStatusBadge(request.status)}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
