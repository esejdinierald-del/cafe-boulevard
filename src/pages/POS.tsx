import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { OrderPanel } from "@/components/pos/OrderPanel";
import { usePOSStore } from "@/stores/pos-store";
import { LogOut, Coffee, PowerOff, Package, Printer, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { closePrintWindow, openReceiptPrintWindow, writeReceiptAndPrint } from "@/lib/receipt-print";

interface TableRow {
  id: string;
  number: number | string;
  name: string | null;
  status: string | null;
}

interface OpenOrderRow {
  table_number: number | null;
  total_amount: number | null;
  status: string | null;
}

interface TableOrderDetail {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  operator_name: string | null;
  items: Array<{ name: string; price: number; quantity: number; notes?: string }>;
}

const POS = () => {
  const navigate = useNavigate();
  const currentOrder = usePOSStore((s) => s.currentOrder);
  const startOrder = usePOSStore((s) => s.startOrder);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tableTotals, setTableTotals] = useState<Record<string, number>>({});
  const [closing, setClosing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [viewTable, setViewTable] = useState<{ number: number | string; orders: TableOrderDetail[] } | null>(null);

  // Gate: require staff shift token
  useEffect(() => {
    const token = localStorage.getItem("staff_shift_token");
    if (!token) {
      navigate("/staff", { replace: true });
      return;
    }
    setChecking(false);
  }, [navigate]);

  // Load tables + realtime updates
  useEffect(() => {
    if (checking) return;
    const load = async () => {
      const [{ data: tRows }, { data: oRows }] = await Promise.all([
        supabase.from("tables").select("id, number, name, status").order("number"),
        supabase
          .from("pos_orders")
          .select("table_number, total_amount, status")
          .in("status", ["open", "ready"]),
      ]);
      setTables((tRows as TableRow[]) || []);
      const totals: Record<string, number> = {};
      for (const o of (oRows as OpenOrderRow[]) || []) {
        if (o.table_number == null) continue;
        const key = String(o.table_number);
        totals[key] = (totals[key] || 0) + Number(o.total_amount || 0);
      }
      setTableTotals(totals);
    };
    load();
    const channel = supabase
      .channel("pos-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_orders" }, load)
      .subscribe();
    const poll = setInterval(load, 5000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [checking]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        Duke verifikuar turnin...
      </div>
    );
  }

  const activeTableNumber = currentOrder?.tableNumber ?? null;

  const viewTableOrders = async (tableNumber: number | string) => {
    const { data, error } = await supabase
      .from("pos_orders")
      .select("id, status, total_amount, created_at, operator_name, items")
      .eq("table_number", Number(tableNumber))
      .in("status", ["open", "ready"])
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Gabim: " + error.message);
      return;
    }
    setViewTable({ number: tableNumber, orders: (data as TableOrderDetail[]) || [] });
  };

  const closeTable = async (tableNumber: number | string) => {
    const printWindow = openReceiptPrintWindow(`Tavolina #${tableNumber}`);
    if (!printWindow) toast.error("Lejo pop-ups në browser që të hapet printimi.");
    if (!confirm(`Të mbyllim & printojmë tavolinën #${tableNumber}?`)) {
      closePrintWindow(printWindow);
      return;
    }
    setClosing(true);
    try {
      const { data: openOrders } = await supabase
        .from("pos_orders")
        .select("id")
        .eq("table_number", Number(tableNumber))
        .in("status", ["open", "ready"]);
      const ids = ((openOrders as { id: string }[]) || []).map((o) => o.id);
      if (ids.length === 0) {
        closePrintWindow(printWindow);
        toast.error("Asnjë porosi e hapur për këtë tavolinë");
        return;
      }
      const operatorName = localStorage.getItem("staff_name") || "Kamarier";
      const receipts: string[] = [];
      for (const id of ids) {
        const { data, error } = await supabase.functions.invoke("pos-print-ticket", {
          body: { orderId: id, closeOrder: true, operatorName },
        });
        const err = (data as any)?.error || error?.message;
        if (err) throw new Error(err);
        if ((data as any)?.receiptText) receipts.push(String((data as any).receiptText));
      }
      toast.success(`Tavolina #${tableNumber} u mbyll`);
      if (receipts.length > 0) writeReceiptAndPrint(printWindow, receipts.join("\n\n------------------------------------------\n\n"), `Tavolina #${tableNumber}`);
    } catch (e) {
      closePrintWindow(printWindow);
      toast.error("Gabim: " + (e as Error).message);
    } finally {
      setClosing(false);
    }
  };

  const handleEndShift = () => {
    if (!confirm("Të mbyllim turnin dhe të dilni?")) return;
    localStorage.removeItem("staff_shift_token");
    usePOSStore.getState().setCurrentOrder(null);
    navigate("/staff", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h1 className="text-xl font-bold">POS Kamarier</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startOrder("bar", null)}
            className="flex items-center gap-2 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm"
          >
            <Coffee size={14} /> Modalitet Banak
          </button>
          {(localStorage.getItem("staff_role") || "waiter") !== "kitchen" && (
            <button
              onClick={() => navigate("/inventory")}
              className="flex items-center gap-2 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm"
            >
              <Package size={14} /> Inventari
            </button>
          )}
          <button
            onClick={() => navigate("/staff")}
            className="flex items-center gap-2 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-sm"
          >
            <LogOut size={14} /> Kthehu te Turni
          </button>
          <button
            onClick={handleEndShift}
            className="flex items-center gap-2 px-3 py-2 rounded bg-red-700 hover:bg-red-600 text-sm"
          >
            <PowerOff size={14} /> Mbyll Turnin
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_360px] gap-3 p-3">
        {/* Left: tables */}
        <aside className="bg-slate-800 rounded-lg p-3 max-h-[85vh] overflow-y-auto">
          <div className="text-slate-400 text-xs uppercase font-semibold mb-2">Tavolinat</div>
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-2">
            {tables.map((t) => {
              const occupied = t.status === "occupied";
              const isActive = String(activeTableNumber) === String(t.number);
              const total = tableTotals[String(t.number)] || 0;
              const hasOrders = total > 0;
              return (
                <div
                  key={t.id}
                  className={`relative aspect-square rounded-lg border-2 transition ${
                    isActive
                      ? "border-amber-400 bg-amber-500/20"
                      : occupied || hasOrders
                      ? "border-red-500/50 bg-red-500/20 text-red-200"
                      : "border-green-500/50 bg-green-500/10 text-green-200"
                  }`}
                >
                  <button
                    onClick={() => startOrder("table", t.number as number)}
                    className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold hover:bg-white/5 rounded-lg"
                  >
                    <span>#{t.number}</span>
                    {hasOrders ? (
                      <span className="text-[11px] font-bold text-amber-300 mt-1">
                        {total.toFixed(0)} L
                      </span>
                    ) : (
                      <span className="text-[10px] opacity-70 mt-1">
                        e lirë
                      </span>
                    )}
                  </button>
                  {hasOrders && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); viewTableOrders(t.number); }}
                        title="Shiko porositë"
                        className="absolute top-1 right-1 p-1.5 rounded-md bg-slate-700/90 hover:bg-slate-600 text-white z-10 shadow"
                      >
                        <Eye size={20} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTable(t.number); }}
                        disabled={closing}
                        title="Mbyll & printo tavolinën"
                        className="absolute bottom-1 right-1 p-1 rounded bg-amber-600 hover:bg-amber-500 text-white z-10 disabled:opacity-50"
                      >
                        <Printer size={12} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
            {tables.length === 0 && (
              <div className="col-span-full text-slate-500 text-xs text-center py-4">
                Nuk ka tavolina
              </div>
            )}
          </div>
        </aside>

        {/* Middle: menu */}
        <main>
          <MenuGrid />
        </main>

        {/* Right: cart */}
        <aside>
          <OrderPanel />
        </aside>
      </div>

      {viewTable && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewTable(null)}
        >
          <div
            className="bg-slate-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewTable(null)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-slate-700"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold mb-3">Tavolina #{viewTable.number}</h2>
            {viewTable.orders.length === 0 ? (
              <div className="text-slate-400 text-sm">Nuk ka porosi aktive.</div>
            ) : (
              <div className="space-y-4">
                {viewTable.orders.map((o, idx) => (
                  <div key={o.id} className="border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>
                        Porosi #{idx + 1} • {o.status === "ready" ? "✓ Gati" : "⏳ Në pritje"}
                      </span>
                      <span>{new Date(o.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {o.operator_name && (
                      <div className="text-xs text-slate-400 mb-2">Kamarieri: {o.operator_name}</div>
                    )}
                    <ul className="text-sm space-y-1">
                      {(o.items || []).map((it, i) => (
                        <li key={i} className="flex justify-between border-b border-slate-700/50 pb-1">
                          <span>
                            {it.name} <span className="text-slate-400">x{it.quantity}</span>
                            {it.notes && <span className="text-xs italic text-amber-400 ml-2">({it.notes})</span>}
                          </span>
                          <span className="text-amber-300">{(Number(it.price) * it.quantity).toFixed(0)} L</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between font-bold pt-2 mt-2 border-t border-slate-700">
                      <span>Totali</span>
                      <span className="text-amber-300">{Number(o.total_amount).toFixed(0)} Lekë</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-3 border-t border-slate-700 text-amber-300">
                  <span>TOTALI I TAVOLINËS</span>
                  <span>{viewTable.orders.reduce((s, o) => s + Number(o.total_amount), 0).toFixed(0)} Lekë</span>
                </div>
                <button
                  onClick={() => {
                    const num = viewTable.number;
                    setViewTable(null);
                    closeTable(num);
                  }}
                  disabled={closing}
                  className="w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-50"
                >
                  <Printer size={18} /> Mbyll & Printo Tavolinën
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;