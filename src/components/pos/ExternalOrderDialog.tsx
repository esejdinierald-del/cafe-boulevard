import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X, Plus, Minus, Trash2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function ExternalOrderDialog({ open, onClose, onCreated }: Props) {
  const [platform, setPlatform] = useState<"glovo" | "bolt">("glovo");
  const [ref, setRef] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: mi }, { data: c }] = await Promise.all([
        supabase.from("menu_items").select("id, name, price, category_id").eq("is_active", true).order("name"),
        supabase.from("categories").select("id, name").order("display_order"),
      ]);
      setItems((mi as MenuItem[]) || []);
      setCats((c as Category[]) || []);
    })();
  }, [open]);

  if (!open) return null;

  const filtered = items.filter((i) => {
    if (activeCat && i.category_id !== activeCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const add = (m: MenuItem) => {
    setCart((c) => {
      const ex = c.find((l) => l.productId === m.id);
      if (ex) return c.map((l) => (l.productId === m.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...c, { productId: m.id, name: m.name, price: Number(m.price), quantity: 1 }];
    });
  };
  const dec = (id: string) =>
    setCart((c) =>
      c.flatMap((l) => (l.productId === id ? (l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : []) : [l])),
    );
  const remove = (id: string) => setCart((c) => c.filter((l) => l.productId !== id));

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const submit = async () => {
    if (cart.length === 0) {
      toast.error("Shporta është bosh");
      return;
    }
    setBusy(true);
    try {
      const operatorName = localStorage.getItem("staff_name") || "Kamarier";
      const shiftToken = localStorage.getItem("staff_shift_token");
      const { data, error } = await supabase.functions.invoke("pos-create-order", {
        body: {
          mode: "delivery",
          source: platform,
          externalRef: ref || null,
          operatorName,
          shiftToken: shiftToken ?? undefined,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        },
        headers: shiftToken ? { "x-shift-token": shiftToken } : undefined,
      });
      const err = (data as any)?.error || error?.message;
      if (err) throw new Error(err);
      toast.success(`Porosia ${platform.toUpperCase()} u regjistrua ✓`);
      setCart([]);
      setRef("");
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error("Gabim: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold">Porosi e Jashtme</h2>
            <p className="text-xs text-slate-400">Regjistrim i shpejtë për delivery</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 grid grid-cols-2 gap-2">
          <div className="flex gap-2">
            {(["glovo", "bolt"] as const).map((p) => (
              <button type="button"
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex-1 py-2 rounded font-semibold text-sm ${
                  platform === p
                    ? p === "glovo"
                      ? "bg-yellow-400 text-slate-900"
                      : "bg-green-500 text-white"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Kodi i porosisë (opsional)"
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-0 flex-1 overflow-hidden">
          <div className="flex flex-col overflow-hidden border-r border-slate-700">
            <div className="p-2 border-b border-slate-700 space-y-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kërko artikull..."
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm"
              />
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button type="button"
                  onClick={() => setActiveCat(null)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                    !activeCat ? "bg-amber-500 text-slate-900" : "bg-slate-700"
                  }`}
                >
                  Të gjitha
                </button>
                {cats.map((c) => (
                  <button type="button"
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                      activeCat === c.id ? "bg-amber-500 text-slate-900" : "bg-slate-700"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto p-2 grid grid-cols-2 gap-2">
              {filtered.map((m) => (
                <button type="button"
                  key={m.id}
                  onClick={() => add(m)}
                  className="text-left p-2 rounded bg-slate-900 hover:bg-slate-700 border border-slate-700"
                >
                  <div className="text-xs font-medium line-clamp-2">{m.name}</div>
                  <div className="text-xs text-amber-300 mt-1">{Number(m.price).toFixed(0)} L</div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-xs text-slate-500 py-6">Asnjë artikull</div>
              )}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-700 text-xs font-semibold text-slate-400">
              SHPORTA ({cart.length})
            </div>
            <ul className="flex-1 overflow-y-auto p-2 space-y-1">
              {cart.map((l) => (
                <li key={l.productId} className="p-2 rounded bg-slate-900 border border-slate-700 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{l.name}</span>
                    <button type="button" onClick={() => remove(l.productId)} className="text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => dec(l.productId)} className="p-1 bg-slate-700 rounded">
                        <Minus size={10} />
                      </button>
                      <span className="w-6 text-center">{l.quantity}</span>
                      <button type="button" onClick={() => add({ id: l.productId, name: l.name, price: l.price, category_id: null })} className="p-1 bg-slate-700 rounded">
                        <Plus size={10} />
                      </button>
                    </div>
                    <span className="text-amber-300">{(l.price * l.quantity).toFixed(0)} L</span>
                  </div>
                </li>
              ))}
              {cart.length === 0 && (
                <li className="text-center text-slate-500 text-xs py-6">Bosh</li>
              )}
            </ul>
            <div className="p-3 border-t border-slate-700 space-y-2">
              <div className="flex justify-between font-bold">
                <span>Totali</span>
                <span className="text-amber-300">{total.toFixed(0)} L</span>
              </div>
              <button type="button"
                onClick={submit}
                disabled={busy || cart.length === 0}
                className="w-full py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold disabled:opacity-50"
              >
                {busy ? "Duke ruajtur..." : "Regjistro Porosinë"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}