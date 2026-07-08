import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { OrderPanel } from "@/components/pos/OrderPanel";
import { usePOSStore } from "@/stores/pos-store";
import { LogOut, Coffee, PowerOff, Package } from "lucide-react";

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

const POS = () => {
  const navigate = useNavigate();
  const currentOrder = usePOSStore((s) => s.currentOrder);
  const startOrder = usePOSStore((s) => s.startOrder);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tableTotals, setTableTotals] = useState<Record<string, number>>({});
  const [checking, setChecking] = useState(true);

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
    return () => {
      supabase.removeChannel(channel);
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
              return (
                <button
                  key={t.id}
                  onClick={() => startOrder("table", t.number as number)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-semibold border-2 transition ${
                    isActive
                      ? "border-amber-400 bg-amber-500/20"
                      : occupied
                      ? "border-red-500/50 bg-red-500/20 text-red-200"
                      : "border-green-500/50 bg-green-500/10 text-green-200 hover:bg-green-500/20"
                  }`}
                >
                  <span>#{t.number}</span>
                  {total > 0 ? (
                    <span className="text-[11px] font-bold text-amber-300 mt-1">
                      {total.toFixed(0)} L
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-70 mt-1">
                      {occupied ? "e zënë" : "e lirë"}
                    </span>
                  )}
                </button>
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
    </div>
  );
};

export default POS;