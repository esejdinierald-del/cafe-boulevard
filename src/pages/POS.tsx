import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { OrderPanel } from "@/components/pos/OrderPanel";
import { MobileOrderSheet } from "@/components/pos/MobileOrderSheet";
import { usePOSStore } from "@/stores/pos-store";
import { LogOut, Coffee, PowerOff, Package, Printer, Eye, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { printReceipt } from "@/lib/receipt-print";
import { queuePrintJob, countPendingForMe } from "@/lib/print-queue";
import { RomeClock } from "@/components/RomeClock";
import { isPastShiftDay } from "@/lib/rome-time";

import { staffRead } from "@/lib/staff-read";

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
  const [pendingPrints, setPendingPrints] = useState(0);
  
  const [mobileView, setMobileView] = useState<"tables" | "menu">("tables");

  // Track our pending print jobs (waiting for the arka PC)
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const n = await countPendingForMe();
      if (mounted) setPendingPrints(n);
    };
    refresh();
    const ch = supabase
      .channel("pos-my-prints")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "print_jobs" },
        refresh,
      )
      .subscribe();
    const poll = setInterval(refresh, 5000);
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, []);

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
      const [tblRes, ordersRes] = await Promise.all([
        supabase.from("tables").select("id, number, name, status").order("number"),
        staffRead<OpenOrderRow[]>("pos_orders.open_all"),
      ]);
      if (tblRes.error) toast.error("Gabim tavolina: " + tblRes.error.message);
      if (ordersRes.error) toast.error("Gabim porosi: " + ordersRes.error);
      setTables((tblRes.data as TableRow[]) || []);
      const totals: Record<string, number> = {};
      for (const o of (ordersRes.data as OpenOrderRow[]) || []) {
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
    const { data, error } = await staffRead<TableOrderDetail[]>("pos_orders.by_table", {
      tableNumber: Number(tableNumber),
    });
    if (error) {
      toast.error("Gabim: " + error);
      return;
    }
    setViewTable({ number: tableNumber, orders: (data as TableOrderDetail[]) || [] });
  };

  const closeTable = async (tableNumber: number | string) => {
    if (!confirm(`Të mbyllim & printojmë tavolinën #${tableNumber}?`)) {
      return;
    }
    setClosing(true);
    try {
      const { data: openOrders, error: fetchErr } = await staffRead<{ id: string }[]>(
        "pos_orders.by_table_ids",
        { tableNumber: Number(tableNumber) },
      );
      if (fetchErr) throw new Error(fetchErr);
      const ids = (openOrders || []).map((o) => o.id);
      if (ids.length === 0) {
        toast.error("Asnjë porosi e hapur për këtë tavolinë");
        return;
      }
      const operatorName = localStorage.getItem("staff_name") || "Kamarier";
      const receipts: string[] = [];
      for (const id of ids) {
        const shiftToken = localStorage.getItem("staff_shift_token") || undefined;
        const { data, error } = await supabase.functions.invoke("pos-print-ticket", {
          body: { orderId: id, closeOrder: true, operatorName, shiftToken },
          headers: shiftToken ? { "x-shift-token": shiftToken } : undefined,
        });
        const err = (data as any)?.error || error?.message;
        if (err) throw new Error(err);
        if ((data as any)?.receiptText) receipts.push(String((data as any).receiptText));
      }
      toast.success(`Tavolina #${tableNumber} u mbyll`);
      if (receipts.length > 0) {
        const combined = receipts.join("\n\n------------------------------------------\n\n");
        const jobId = await queuePrintJob({
          receiptText: combined,
          title: `Tavolina #${tableNumber}`,
          kind: "close_table",
          station: "arka",
          tableCode: tableNumber,
        });
        if (jobId) {
          toast.success("Bileta u dërgua tek arka për printim ✓");
        } else {
          // Fallback: try local print
          printReceipt(combined, `Tavolina #${tableNumber}`);
        }
      }
    } catch (e) {
      toast.error("Gabim: " + (e as Error).message);
    } finally {
      setClosing(false);
    }
  };

  const handleEndShift = async () => {
    if (!confirm("Të mbyllim turnin dhe të dilni?")) return;
    const startedDate = localStorage.getItem("staff_shift_started_date");
    if (isPastShiftDay(startedDate)) {
      const pw = window.prompt(
        "Ora zyrtare (Rome/Tirana) ka kaluar 23:59 të ditës së turnit.\n" +
        "Për të mbyllur turnin duhet fjalëkalimi i adminit:",
      );
      if (!pw) return;
      const { data, error } = await supabase.functions.invoke("verify-admin-passcode", {
        body: { passcode: pw },
      });
      const err = (data as any)?.error || error?.message;
      if (!(data as any)?.valid) {
        toast.error(err || "Fjalëkalim i pasaktë");
        return;
      }
    }
    localStorage.removeItem("staff_shift_token");
    localStorage.removeItem("staff_shift_started_date");
    usePOSStore.getState().setCurrentOrder(null);
    navigate("/staff", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between px-2 md:px-3 py-1.5 md:py-2 border-b border-slate-800 bg-slate-900/95 z-20">
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <h1 className="text-sm md:text-lg font-bold whitespace-nowrap">POS Kamarier</h1>
          <RomeClock />
          {pendingPrints > 0 && (
            <span
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-semibold animate-pulse"
              title="Bileta të tuat në pritje të printimit tek arka"
            >
              <Printer size={12} /> Në pritje: {pendingPrints}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button type="button"
            title="Banak"
            onClick={() => { startOrder("bar", null); setMobileView("menu"); }}
            className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded bg-slate-700 hover:bg-slate-600"
          >
            <Coffee size={18} />
          </button>
          {(localStorage.getItem("staff_role") || "waiter") !== "kitchen" && (
            <button type="button"
              onClick={() => navigate("/inventory")}
              className="hidden sm:flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-1.5 md:py-2 rounded bg-slate-700 hover:bg-slate-600 text-xs md:text-sm"
            >
              <Package size={14} /> <span className="hidden md:inline">Inventari</span>
            </button>
          )}
          <button type="button"
            onClick={() => navigate("/staff")}
            className="flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-1.5 md:py-2 rounded bg-slate-700 hover:bg-slate-600 text-xs md:text-sm"
          >
            <LogOut size={14} /> <span className="hidden sm:inline">Turni</span>
          </button>
          <button type="button"
            onClick={handleEndShift}
            className="flex items-center gap-1 md:gap-2 px-1.5 md:px-3 py-1.5 md:py-2 rounded bg-red-700 hover:bg-red-600 text-xs md:text-sm"
          >
            <PowerOff size={14} /> <span className="hidden sm:inline">Mbyll</span>
          </button>
        </div>
      </header>

      {/* Mobile: step-by-step table → menu */}
      <div className="lg:hidden p-2" style={{ paddingBottom: mobileView === "menu" ? "80px" : "20px" }}>
        {mobileView === "tables" ? (
          <div className="bg-slate-800 rounded-lg p-2">
            <div className="text-slate-400 text-xs uppercase font-semibold mb-2">Tavolinat</div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {[...tables]
                .sort((a, b) => Number(a.number) - Number(b.number))
                .map((t) => {
                const occupied = t.status === "occupied";
                const isActive = String(activeTableNumber) === String(t.number);
                const total = tableTotals[String(t.number)] || 0;
                const hasOrders = total > 0;
                return (
                  <div
                    key={t.id}
                    className={`relative aspect-[4/3] rounded-lg border-2 transition ${
                      isActive
                        ? "border-amber-400 bg-amber-500/20"
                        : occupied || hasOrders
                        ? "border-red-500/50 bg-red-500/20 text-red-200"
                        : "border-green-500/50 bg-green-500/10 text-green-200"
                    }`}
                  >
                    <button type="button"
                      onClick={() => { startOrder("table", t.number as number); setMobileView("menu"); }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-xs font-semibold hover:bg-white/5 rounded-lg"
                    >
                      <span>#{t.number}</span>
                      {hasOrders && (
                        <span className="text-[10px] font-bold text-amber-300 mt-0.5">
                          {total.toFixed(0)} L
                        </span>
                      )}
                    </button>
                    {hasOrders && (
                      <>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); viewTableOrders(t.number); }}
                          title="Shiko porositë"
                          className="absolute top-0.5 right-0.5 p-1 rounded-md bg-slate-700/90 hover:bg-slate-600 text-white z-10 shadow"
                        >
                          <Eye size={14} />
                        </button>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); closeTable(t.number); }}
                          disabled={closing}
                          title="Mbyll & printo tavolinën"
                          className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white z-10 disabled:opacity-50"
                        >
                          <Printer size={10} />
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
          </div>
        ) : (
          <div className="space-y-2">
            <button type="button"
              onClick={() => setMobileView("tables")}
              className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm text-white"
            >
              <ArrowLeft size={16} /> Kthehu te tavolinat
            </button>
            <MenuGrid />
          </div>
        )}
      </div>

      {/* Mobile: sticky bottom sheet for current order (shows only when order active) */}
      {mobileView === "menu" && <MobileOrderSheet />}

      {/* Desktop: 3-column layout */}
      <div className="hidden lg:grid grid-cols-[220px_1fr_360px] gap-3 p-3">
        {/* Left: tables */}
        <aside className="bg-slate-800 rounded-lg p-3 max-h-[85vh] overflow-y-auto">
          <div className="text-slate-400 text-xs uppercase font-semibold mb-2">Tavolinat</div>
          <div className="grid grid-cols-2 gap-2">
            {[...tables]
              .sort((a, b) => Number(a.number) - Number(b.number))
              .map((t) => {
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
                  <button type="button"
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
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); viewTableOrders(t.number); }}
                        title="Shiko porositë"
                        className="absolute top-1 right-1 p-1.5 rounded-md bg-slate-700/90 hover:bg-slate-600 text-white z-10 shadow"
                      >
                        <Eye size={20} />
                      </button>
                      <button type="button"
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
            <button type="button"
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
                {/* Full receipt-style header */}
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-[11px] leading-tight text-slate-100">
                  <div className="text-center font-bold text-sm">BOULEVARD CAFÉ</div>
                  <div className="text-center text-slate-400">Tavolina #{viewTable.number}</div>
                  <div className="text-center text-slate-500">
                    {new Date().toLocaleString("sq-AL")}
                  </div>
                </div>
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
                            {it.name}{" "}
                            <span className="text-slate-400">x{it.quantity}</span>{" "}
                            <span className="text-slate-500 text-xs">
                              ({Number(it.price).toFixed(0)} L/copë)
                            </span>
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
                <button type="button"
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