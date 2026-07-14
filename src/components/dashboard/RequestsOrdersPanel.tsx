import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Receipt, CheckCircle, X, UtensilsCrossed } from "lucide-react";

export interface ServiceRequest {
  id: string;
  table_number: string;
  request_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface Order {
  id: string;
  table_number: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  total_price: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  notes: string | null;
}

interface Props {
  pendingRequests: ServiceRequest[];
  pendingOrders: Order[];
  completedRequests: ServiceRequest[];
  completedOrders: Order[];
  handleComplete: (id: string) => void;
  handleCancel: (id: string) => void;
  handleCompleteOrder: (id: string) => void;
  handleCancelOrder: (id: string) => void;
  handleDeleteFromHistory: (id: string, type: "request" | "order") => void;
}

const getRequestIcon = (type: string) =>
  type === "waiter" ? <Bell className="h-5 w-5" /> : <Receipt className="h-5 w-5" />;

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending": return <Badge className="bg-warning text-warning-foreground">Në pritje</Badge>;
    case "completed": return <Badge className="bg-success text-success-foreground">Përfunduar</Badge>;
    case "cancelled": return <Badge variant="destructive">Anuluar</Badge>;
    default: return null;
  }
};

export function RequestsOrdersPanel({
  pendingRequests, pendingOrders, completedRequests, completedOrders,
  handleComplete, handleCancel, handleCompleteOrder, handleCancelOrder, handleDeleteFromHistory,
}: Props) {
  return (
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
                    <p className="text-xs text-muted-foreground truncate">{request.request_type === "waiter" ? "Kamarier" : "Faturë"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
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
                      {new Date(order.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
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
                        <p className="text-xs text-muted-foreground truncate">{request.request_type === "waiter" ? "Kamarier" : "Faturë"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteFromHistory(request.id, "request")} className="h-8 w-8 p-0 touch-manipulation">
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
                          {new Date(order.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {order.notes && <p className="text-xs bg-muted/50 p-1.5 rounded mt-1 italic">{order.notes}</p>}
                        <p className="text-xs font-semibold mt-0.5">{order.total_price.toLocaleString()} L</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteFromHistory(order.id, "order")} className="h-8 w-8 p-0 touch-manipulation">
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
  );
}