import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, X, Ban, Minus, BellRing, ChevronDown, ChevronRight, History, Calendar, Lock, Download, Trash2 } from "lucide-react";
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"active" | "history">("active");

  const requireAdmin = (): string | null => {
    if (adminPw) return adminPw;
    const pw = window.prompt(
      "Fjalëkalimi i adminit për anulim\n(Passcode standard: 2025 — nëse është ndryshuar, përdor atë të ri)",
    );
    if (!pw) return null;
    setAdminPw(pw);
    return pw;
  };

  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

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
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={tab === "active" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("active")}
        >
          Aktive ({orders.length})
        </Button>
        <Button
          variant={tab === "history" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("history")}
        >
          <History className="h-4 w-4 mr-1" /> Historiku (Admin)
        </Button>
      </div>

      {tab === "active" && (
        <>
          {orders.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Asnjë porosi aktive.</div>
          )}
          <div className="space-y-2">
            {orders.map((o, idx) => {
              const isOpen = !!expanded[o.id];
              return (
                <Card
                  key={o.id}
                  className={`overflow-hidden ${
                    o.status === "open"
                      ? "border-amber-500/60 ring-1 ring-amber-500/30"
                      : "border-green-500/60"
                  }`}
                >
                  <button
                    onClick={() => toggleExpand(o.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition text-left"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Badge variant="outline" className="shrink-0">#{idx + 1}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">
                        {o.table_number ? `Tavolina #${o.table_number}` : o.mode.toUpperCase()}
                        {o.operator_name && (
                          <span className="text-xs text-muted-foreground font-normal ml-2">
                            • {o.operator_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                        {" • "}{o.items.length} artikuj
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-amber-500">{Number(o.total_amount).toFixed(0)} L</div>
                      <Badge variant={o.status === "ready" ? "default" : "secondary"} className="text-[10px]">
                        {o.status === "ready" ? "GATI ✓" : "⏳ Pritje"}
                      </Badge>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-3 pt-0 space-y-3 border-t border-border/40">
                      <ul className="text-sm space-y-1 pt-2">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex justify-between items-center gap-2">
                            <span className="flex-1">
                              {it.name} <span className="text-muted-foreground">x{it.quantity}</span>
                              {it.notes && <span className="text-xs italic text-amber-500 ml-2">({it.notes})</span>}
                            </span>
                            <span className="text-amber-500 font-semibold">{(it.price * it.quantity).toFixed(0)} L</span>
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
                        <Ban className="h-4 w-4 mr-1" /> Anulo porosinë (Admin)
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === "history" && <CashierHistoryPanel />}

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

// ---------- Cashier history (Admin) ----------
interface Txn {
  id: string;
  amount: number;
  operator_name: string | null;
  table_number: number | null;
  created_at: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const CashierHistoryPanel = () => {
  const [date, setDate] = useState<string>(todayISO());
  const [fromTime, setFromTime] = useState<string>("00:00");
  const [toTime, setToTime] = useState<string>("23:59");
  const [operator, setOperator] = useState<string>("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const start = new Date(`${date}T${fromTime}:00`).toISOString();
    const end = new Date(`${date}T${toTime}:59`).toISOString();
    let q = supabase
      .from("transactions")
      .select("id, amount, operator_name, table_number, created_at, items")
      .eq("type", "sale")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });
    if (operator.trim()) q = q.ilike("operator_name", `%${operator.trim()}%`);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error("Gabim: " + error.message);
      return;
    }
    setTxns((data as unknown as Txn[]) || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggregate items sold
  const summary = (() => {
    const map = new Map<string, { name: string; quantity: number; total: number }>();
    for (const t of txns) {
      for (const it of t.items || []) {
        const key = it.name;
        const prev = map.get(key) || { name: it.name, quantity: 0, total: 0 };
        prev.quantity += Number(it.quantity) || 0;
        prev.total += (Number(it.price) || 0) * (Number(it.quantity) || 0);
        map.set(key, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  })();

  const grandTotal = txns.reduce((s, t) => s + Number(t.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-3 grid gap-3 md:grid-cols-5 items-end">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nga ora</Label>
          <Input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Deri në orën</Label>
          <Input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kamarier (opsional)</Label>
          <Input placeholder="Emri..." value={operator} onChange={(e) => setOperator(e.target.value)} />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? "Duke ngarkuar..." : "Kërko"}
        </Button>
      </Card>

      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Përmbledhje ({txns.length} porosi)</h3>
          <div className="text-lg font-bold text-amber-500">
            {grandTotal.toFixed(0)} Lekë
          </div>
        </div>
        {summary.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Asnjë shitje në këtë interval.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-1 pr-2">Artikulli</th>
                  <th className="py-1 px-2 text-right">Sasia</th>
                  <th className="py-1 pl-2 text-right">Vlera</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.name} className="border-b border-border/30">
                    <td className="py-1 pr-2">{s.name}</td>
                    <td className="py-1 px-2 text-right font-semibold">{s.quantity}</td>
                    <td className="py-1 pl-2 text-right text-amber-500">{s.total.toFixed(0)} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction list */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground uppercase font-semibold">
          Porositë e mbyllura
        </div>
        {txns.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">Asnjë.</div>
        )}
        {txns.map((t) => {
          const open = !!expanded[t.id];
          return (
            <Card key={t.id} className="overflow-hidden">
              <button
                onClick={() => setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40"
              >
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {t.table_number ? `Tavolina #${t.table_number}` : "TAKEAWAY"}
                    {t.operator_name && (
                      <span className="text-xs text-muted-foreground font-normal ml-2">
                        • {t.operator_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("sq-AL")}
                  </div>
                </div>
                <div className="text-amber-500 font-bold">{Number(t.amount).toFixed(0)} L</div>
              </button>
              {open && (
                <div className="border-t border-border/40 p-3">
                  <ul className="text-sm space-y-1">
                    {(t.items || []).map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.name} <span className="text-muted-foreground">x{it.quantity}</span></span>
                        <span>{(Number(it.price) * Number(it.quantity)).toFixed(0)} L</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};