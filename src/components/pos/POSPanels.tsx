import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, X } from "lucide-react";

interface Split {
  id: string;
  order_id: string;
  type: string;
  status: string;
  items: Array<{ name: string; quantity: number; notes?: string }>;
  confirmed_at: string | null;
  created_at: string;
  pos_orders?: { table_number: number | null; mode: string } | null;
}

interface POSOrder {
  id: string;
  table_number: number | null;
  mode: string;
  status: string;
  total_amount: number;
  items: Array<{ name: string; quantity: number; price: number; notes?: string }>;
  created_at: string;
}

// ---------- KDS (bar / kitchen) ----------
export const KDSPanel = ({ kind }: { kind: "bar" | "kitchen" }) => {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("order_items_split")
      .select("*, pos_orders(table_number, mode)")
      .eq("type", kind)
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setSplits(((data as unknown) as Split[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`kds-${kind}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items_split" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const confirm = async (splitId: string) => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("pos-confirm-order", {
      body: { splitId },
    });
    setLoading(false);
    if (error) {
      toast.error("Gabim: " + error.message);
    } else {
      toast.success("U konfirmua");
    }
  };

  if (splits.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Asnjë porosi në pritje për {kind === "bar" ? "banakun" : "kuzhinën"}.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {splits.map((s) => (
        <Card key={s.id} className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold">
              {s.pos_orders?.table_number ? `Tavolina #${s.pos_orders.table_number}` : (s.pos_orders?.mode ?? "").toUpperCase()}
            </div>
            <Badge variant="secondary">
              {new Date(s.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
            </Badge>
          </div>
          <ul className="text-sm space-y-1">
            {s.items.map((it, i) => (
              <li key={i} className="flex justify-between border-b border-border/40 pb-1">
                <span>{it.name} <span className="text-muted-foreground">x{it.quantity}</span></span>
                {it.notes && <span className="text-xs italic text-amber-500">{it.notes}</span>}
              </li>
            ))}
          </ul>
          <Button onClick={() => confirm(s.id)} disabled={loading} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Gati
          </Button>
        </Card>
      ))}
    </div>
  );
};

// ---------- Cashier (Arka) ----------
export const CashierPanel = () => {
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("pos_orders")
      .select("*")
      .in("status", ["ready", "open"])
      .order("created_at", { ascending: true });
    setOrders(((data as unknown) as POSOrder[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("cashier-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_orders" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const printAndClose = async (orderId: string, close: boolean) => {
    setLoading(true);
    const operatorName = localStorage.getItem("staff_name") || "Kasier";
    const { data, error } = await supabase.functions.invoke("pos-print-ticket", {
      body: { orderId, closeOrder: close, operatorName: close ? operatorName : null },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error("Gabim: " + (error?.message || (data as any)?.error));
      return;
    }
    setReceipt((data as any).receiptText);
    if (close) toast.success("Porosia u mbyll");
  };

  return (
    <div className="space-y-3">
      {orders.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">Asnjë porosi aktive.</div>
      )}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <Card key={o.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold">
                {o.table_number ? `Tavolina #${o.table_number}` : o.mode.toUpperCase()}
              </div>
              <Badge variant={o.status === "ready" ? "default" : "secondary"}>
                {o.status === "ready" ? "GATI" : "HAPUR"}
              </Badge>
            </div>
            <ul className="text-sm space-y-1">
              {o.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>{it.name} x{it.quantity}</span>
                  <span>{(it.price * it.quantity).toFixed(0)} L</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Totali</span>
              <span>{Number(o.total_amount).toFixed(0)} Lekë</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printAndClose(o.id, false)}
                disabled={loading}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-1" /> Parapamje
              </Button>
              <Button
                size="sm"
                onClick={() => printAndClose(o.id, true)}
                disabled={loading || o.status !== "ready"}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Printo & Mbyll
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setReceipt(null)}>
          <Card className="bg-white text-black max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setReceipt(null)}>
              <X className="h-4 w-4" />
            </Button>
            <pre className="font-mono text-xs whitespace-pre leading-tight">{receipt}</pre>
            <Button className="w-full mt-4" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Printo
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};