import { usePOS } from "@/hooks/use-pos";
import { usePOSStore } from "@/stores/pos-store";
import { useAuth } from "@/hooks/use-auth";
import { Minus, Plus, X, Send } from "lucide-react";
import { useState } from "react";

export const OrderPanel = () => {
  const { currentOrder, addItem, removeItem, updateItemNotes, submitOrder } = usePOS();
  const { shiftToken } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!currentOrder) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg text-center text-slate-400">
        <div className="text-lg font-medium">Zgjidh një tavolinë</div>
        <div className="text-sm mt-1">për të filluar porosinë</div>
      </div>
    );
  }

  const total = currentOrder.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (currentOrder.items.length === 0) return;
    setLoading(true);
    try {
      await submitOrder(shiftToken || "");
    } catch {
      alert("Gabim gjatë dërgimit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg flex flex-col gap-3">
      <div className="flex justify-between items-baseline">
        <div className="text-white text-lg font-bold">
          Tavolina {currentOrder.tableNumber || "Direkt"}
        </div>
        <div className="text-slate-400 text-xs">Mode: {currentOrder.mode}</div>
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
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

      <div className="border-t border-slate-700 pt-3 flex flex-col gap-2">
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
          onClick={() => usePOSStore.getState().setCurrentOrder(null)}
          className="w-full bg-slate-700 text-white py-2 rounded hover:bg-slate-600 transition"
        >
          Anulo
        </button>
      </div>
    </div>
  );
};