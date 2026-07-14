import { useState, useEffect } from "react";
import { usePOS } from "@/hooks/use-pos";
import { usePOSStore } from "@/stores/pos-store";
import { useAuth } from "@/hooks/use-auth";
import { Minus, Plus, X, Send, ChevronUp, ChevronDown, ShoppingCart } from "lucide-react";

export const MobileOrderSheet = () => {
  const { currentOrder, addItem, removeItem, updateItemNotes, submitOrder } = usePOS();
  const { shiftToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const itemCount = currentOrder?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const total = currentOrder?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;

  // Auto-expand when first item is added; collapse when order cleared
  useEffect(() => {
    if (itemCount === 0) setExpanded(false);
  }, [itemCount]);

  // Prevent body scroll while expanded
  useEffect(() => {
    if (expanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [expanded]);

  if (!currentOrder) return null;

  const handleSubmit = async () => {
    if (currentOrder.items.length === 0) return;
    setLoading(true);
    try {
      await submitOrder(shiftToken || "");
      setExpanded(false);
    } catch {
      alert("Gabim gjatë dërgimit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed left-0 right-0 bottom-[1cm] z-50 lg:hidden bg-slate-800 border-t border-slate-700 rounded-t-2xl shadow-2xl transition-transform duration-300 ${
          expanded ? "translate-y-0" : ""
        }`}
        style={{
          maxHeight: "85vh",
          transform: expanded ? "translateY(0)" : undefined,
        }}
      >
        {/* Handle / collapsed bar */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 active:bg-slate-700/50"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingCart size={20} className="text-amber-400" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-white text-sm font-semibold">
                Tav. {currentOrder.tableNumber || "Direkt"}
              </span>
              <span className="text-amber-300 text-xs font-bold">
                {total.toFixed(0)} Lekë
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {itemCount > 0 && !expanded && (
              <span
                onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                className="px-3 py-1.5 rounded bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold flex items-center gap-1"
              >
                <Send size={12} /> Dërgo
              </span>
            )}
            {expanded ? (
              <ChevronDown size={20} className="text-slate-400" />
            ) : (
              <ChevronUp size={20} className="text-slate-400" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="flex flex-col" style={{ maxHeight: "calc(85vh - 52px)" }}>
            <div className="flex-1 overflow-y-auto px-3 pb-2">
              {currentOrder.items.length === 0 ? (
                <div className="text-slate-400 text-sm text-center py-6">
                  Zgjidh artikuj nga menuja
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentOrder.items.map((item) => (
                    <div key={item.productId} className="p-2 bg-slate-700 rounded">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-white text-sm font-medium flex-1">{item.name}</div>
                        <div className="flex items-center gap-1">
                          <button type="button"
                            onClick={() => addItem(item.productId, -1, item.notes, item)}
                            className="bg-red-600 text-white p-1 rounded"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                          <button type="button"
                            onClick={() => addItem(item.productId, 1, item.notes, item)}
                            className="bg-green-600 text-white p-1 rounded"
                          >
                            <Plus size={14} />
                          </button>
                          <button type="button"
                            onClick={() => removeItem(item.productId)}
                            className="bg-red-800 text-white p-1 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Shënime..."
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                        className="w-full mt-1 text-xs bg-slate-600 text-white p-1 rounded border border-slate-500"
                      />
                      <div className="text-slate-400 text-xs mt-1">
                        {item.price} Lekë x {item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="border-t border-slate-700 p-3 flex flex-col gap-2 bg-slate-800"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <div className="flex justify-between text-white font-bold">
                <span>Totali:</span>
                <span>{total.toFixed(0)} Lekë</span>
              </div>
              <button type="button"
                onClick={handleSubmit}
                disabled={loading || currentOrder.items.length === 0}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 rounded hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={16} />
                {loading ? "Duke dërguar..." : "Dërgo Porosinë"}
              </button>
              <button type="button"
                onClick={() => { usePOSStore.getState().setCurrentOrder(null); setExpanded(false); }}
                className="w-full bg-slate-700 text-white py-2 rounded hover:bg-slate-600 transition"
              >
                Anulo
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};