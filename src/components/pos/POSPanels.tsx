import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, X, Ban, Minus, BellRing, ChevronDown, ChevronRight, History, Calendar } from "lucide-react";
import { printReceipt } from "@/lib/receipt-print";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  operator_name?: string | null;
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
    const poll = setInterval(load, 4000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const buildStationTicket = (s: Split) => {
    const LINE = 42;
    const center = (t: string) => " ".repeat(Math.max(0, Math.floor((LINE - t.length) / 2))) + t;
    const line = "-".repeat(LINE);
    const header = s.pos_orders?.table_number
      ? `Tavolina #${s.pos_orders.table_number}`
      : (s.pos_orders?.mode ?? "").toUpperCase();
    const rows: string[] = [];
    rows.push(center(kind === "bar" ? "*** BANAKU ***" : "*** KUZHINA ***"));
    rows.push(center(header));
    rows.push(line);
    rows.push(new Date().toLocaleString("sq-AL"));
    rows.push(line);
    for (const it of s.items) {
      rows.push(`${it.name}  x${it.quantity}`);
      if (it.notes) rows.push(`  (${it.notes})`);
    }
    rows.push(line);
    rows.push(center("GATI ✓"));
    return rows.join("\n");
  };

  const confirm = async (split: Split) => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("pos-confirm-order", {
      body: { splitId: split.id },
    });
    setLoading(false);
    if (error) {
      toast.error("Gabim: " + error.message);
      return;
    }
    toast.success("U konfirmua — duke printuar biletën");
    // Auto-print immediately once the station accepts the order.
    printReceipt(buildStationTicket(split), kind === "bar" ? "Bileta Banak" : "Bileta Kuzhinë");
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
        <Card key={s.id} className="kds-attention p-4 space-y-2 border-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-lg kds-attention-text flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              {s.pos_orders?.table_number ? `Tavolina #${s.pos_orders.table_number}` : (s.pos_orders?.mode ?? "").toUpperCase()}
            </div>
            <Badge variant="secondary" className="text-sm">
              {new Date(s.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
            </Badge>
          </div>
          <ul className="text-base space-y-1 font-semibold">
            {s.items.map((it, i) => (
              <li key={i} className="flex justify-between border-b border-border/40 pb-1">
                <span>{it.name} <span className="text-amber-400 font-black">x{it.quantity}</span></span>
                {it.notes && <span className="text-sm italic text-amber-500">{it.notes}</span>}
              </li>
            ))}
          </ul>
          <Button onClick={() => confirm(s)} disabled={loading} className="w-full h-12 text-base font-bold">
            <CheckCircle2 className="h-5 w-5 mr-2" /> Gati & Printo
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
  const [adminPw, setAdminPw] = useState<string | null>(null);

  const requireAdmin = (): string | null => {
    if (adminPw) return adminPw;
    const pw = window.prompt("Fjalëkalimi i adminit për anulim:");
    if (!pw) return null;
    setAdminPw(pw);
    return pw;
  };

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
    const poll = setInterval(load, 4000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
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
    const receiptText = String((data as any).receiptText || "");
    setReceipt(receiptText);
    if (close) {
      printReceipt(receiptText, "Bileta Tavoline");
      toast.success("Porosia u mbyll");
    }
  };

  const cancelOrder = async (orderId: string) => {
    const pw = requireAdmin();
    if (!pw) return;
    if (!confirm("Anulo këtë porosi? Ky veprim nuk mund të zhbëhet.")) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("pos-cancel-item", {
      body: { orderId, mode: "order", adminPassword: pw },
    });
    setLoading(false);
    const errMsg = (data as any)?.error || error?.message;
    if (errMsg) {
      if (errMsg.includes("Fjalëkalim")) setAdminPw(null);
      toast.error("Gabim: " + errMsg);
      return;
    }
    toast.success("Porosia u anulua");
  };

  // Cancel a single item (decrement qty by 1) — atomic via edge function
  const cancelItem = async (order: POSOrder, index: number) => {
    const pw = requireAdmin();
    if (!pw) return;
    const item = order.items[index];
    if (!item) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("pos-cancel-item", {
      body: { orderId: order.id, itemIndex: index, adminPassword: pw },
    });
    setLoading(false);
    const errMsg = (data as any)?.error || error?.message;
    if (errMsg) {
      if (errMsg.includes("Fjalëkalim")) setAdminPw(null);
      toast.error("Gabim: " + errMsg);
      return;
    }
    if ((data as any)?.cancelledOrder) {
      toast.success(`U hoq "${item.name}". Porosia u mbyll (bosh).`);
    } else {
      toast.success(`U hoq 1x "${item.name}" (-${Number(item.price).toFixed(0)} L)`);
    }
  };

  return (
    <div className="space-y-3">
      {orders.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">Asnjë porosi aktive.</div>
      )}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((o, idx) => (
          <Card
            key={o.id}
            className={`p-4 space-y-2 relative ${
              o.status === "open"
                ? "border-amber-500/60 animate-pulse ring-2 ring-amber-500/40"
                : "border-green-500/60"
            }`}
          >
            <Badge className="absolute -top-2 -left-2" variant="outline">#{idx + 1}</Badge>
            <div className="flex items-center justify-between">
              <div className="font-bold">
                {o.table_number ? `Tavolina #${o.table_number}` : o.mode.toUpperCase()}
              </div>
              <Badge variant={o.status === "ready" ? "default" : "secondary"}>
                {o.status === "ready" ? "GATI ✓" : "⏳ Duke pritur banakun"}
              </Badge>
            </div>
            <ul className="text-sm space-y-1">
              {o.items.map((it, i) => (
                <li key={i} className="flex justify-between items-center gap-2">
                  <span className="flex-1">{it.name} x{it.quantity}</span>
                  <span>{(it.price * it.quantity).toFixed(0)} L</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    onClick={() => cancelItem(o, i)}
                    disabled={loading}
                    title="Hiq 1 nga ky artikull (admin)"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Totali</span>
              <span>{Number(o.total_amount).toFixed(0)} Lekë</span>
            </div>
            {o.operator_name && (
              <div className="text-xs text-muted-foreground">Kamarieri: {o.operator_name}</div>
            )}
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
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelOrder(o.id)}
              disabled={loading}
              className="w-full"
            >
              <Ban className="h-4 w-4 mr-1" /> Anulo porosinë
            </Button>
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
            <Button
              className="w-full mt-4"
              onClick={() => {
                printReceipt(receipt, "Bileta Tavoline");
              }}
            >
              <Printer className="h-4 w-4 mr-2" /> Printo
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};