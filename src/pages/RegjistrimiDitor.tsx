import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2, Package2, Coffee, Lock, Boxes, Settings2, Clock } from "lucide-react";
import {
  InventoryProductData,
  InventoryTurnData,
  emptyProduct,
  emptyTurn,
} from "@/types/inventory.types";
import { InventoryCalculationService as Calc } from "@/services/inventoryCalculations";
import { InventoryStockPropagationService as Prop } from "@/services/inventoryStockPropagation.service";
import { InventorySalesAggregationService as Sales } from "@/services/inventorySalesAggregation.service";
import ProductManagerDialog, { InvProductRow } from "@/components/inventory/ProductManagerDialog";

type InvProduct = InvProductRow;

// Rome-local YYYY-MM-DD
const todayIso = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const shiftIso = (iso: string, delta: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
};

const difColor = (dif: number) =>
  dif > 0 ? "text-emerald-400" : dif < 0 ? "text-rose-400" : "text-slate-400";

const RegjistrimiDitor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closingT1, setClosingT1] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [products, setProducts] = useState<InvProduct[]>([]);
  const [t1, setT1] = useState<InventoryTurnData>(emptyTurn());
  const [t2, setT2] = useState<InventoryTurnData>(emptyTurn());
  const [turn1ClosedAt, setTurn1ClosedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<"t1" | "t2">("t1");
  const [newCoffeeName, setNewCoffeeName] = useState("");

  const staffName = (typeof window !== "undefined" ? localStorage.getItem("staff_name") : null) || "";

  // Guard: same as /staff
  useEffect(() => {
    const token = localStorage.getItem("staff_shift_token");
    if (!token) navigate("/staff", { replace: true });
  }, [navigate]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: prods }, entryRes, seed] = await Promise.all([
          (supabase as any).from("inv_products").select("id, name, sort_order, menu_item_ids, units_per_sale").order("sort_order").order("name"),
          (supabase as any).from("inv_daily_entries").select("turn1_data, turn2_data, turn1_closed_at").eq("entry_date", date).maybeSingle(),
          Prop.loadNextDayStockFor(date),
        ]);
        const productList = (prods || []) as InvProduct[];
        setProducts(productList);
        setTurn1ClosedAt(entryRes?.data?.turn1_closed_at ?? null);

        const loadedT1: InventoryTurnData = entryRes?.data?.turn1_data && Object.keys(entryRes.data.turn1_data).length
          ? { ...emptyTurn(), ...entryRes.data.turn1_data }
          : emptyTurn();
        const loadedT2: InventoryTurnData = entryRes?.data?.turn2_data && Object.keys(entryRes.data.turn2_data).length
          ? { ...emptyTurn(), ...entryRes.data.turn2_data }
          : emptyTurn();

        // Ensure product entries exist for every inv_product
        productList.forEach((p) => {
          if (!loadedT1.products[p.name]) {
            const seedStock = seed?.stock?.[p.name] ?? 0;
            loadedT1.products[p.name] = emptyProduct(seedStock);
          }
          if (!loadedT2.products[p.name]) {
            loadedT2.products[p.name] = emptyProduct(Calc.calculateStockForNextTurn(loadedT1.products[p.name]));
          }
        });

        // Seed mulliri fillim T1 from previous day's stock if available
        if (!loadedT1.mulliriFillim && seed?.mulliriFillim) loadedT1.mulliriFillim = seed.mulliriFillim;

        setT1(loadedT1);
        setT2(loadedT2);
      } catch (e: any) {
        toast.error(e.message || "Gabim ngarkimi");
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  // Auto-sync T2.stokFillim from T1 (theoretical) whenever T1 changes and cell in T2 is untouched (gjendje=0 && shiriti=0 && furnizime=0 -> auto)
  useEffect(() => {
    setT2((prev) => {
      const merged = { ...prev, products: { ...prev.products } };
      Object.entries(t1.products).forEach(([name, p1]) => {
        const theoretical = Calc.calculateStockForNextTurn(p1);
        const existing = merged.products[name] || emptyProduct();
        // Overwrite stokFillim always — spec: T2 read-only propagation
        merged.products[name] = { ...existing, stokFillim: theoretical };
      });
      if (t1.mulliriPerfund && !prev.mulliriFillim) merged.mulliriFillim = t1.mulliriPerfund;
      return merged;
    });
  }, [t1]);

  // Debounced autosave
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const { error } = await (supabase as any)
          .from("inv_daily_entries")
          .upsert(
            { entry_date: date, turn1_data: t1, turn2_data: t2, updated_at: new Date().toISOString() },
            { onConflict: "entry_date" },
          );
        if (error) throw error;
      } catch (e: any) {
        toast.error("Ruajtja dështoi: " + (e.message || e));
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [t1, t2, date, loading]);

  const currentTurn = tab === "t1" ? t1 : t2;
  const setCurrentTurn = tab === "t1" ? setT1 : setT2;

  const updateProduct = (name: string, field: keyof InventoryProductData, value: number) => {
    setCurrentTurn((prev) => {
      const existing = prev.products[name] || emptyProduct();
      return { ...prev, products: { ...prev.products, [name]: { ...existing, [field]: value } } };
    });
  };

  const reloadProducts = async () => {
    const { data } = await (supabase as any)
      .from("inv_products")
      .select("id, name, sort_order, menu_item_ids, units_per_sale")
      .order("sort_order").order("name");
    setProducts((data || []) as InvProduct[]);
  };

  const handleProductsChanged = async (opts?: {
    renamedFrom?: string; renamedTo?: string; deletedName?: string; added?: InvProduct;
  }) => {
    await reloadProducts();
    if (opts?.deletedName) {
      const name = opts.deletedName;
      setT1((prev) => { const c = { ...prev.products }; delete c[name]; return { ...prev, products: c }; });
      setT2((prev) => { const c = { ...prev.products }; delete c[name]; return { ...prev, products: c }; });
    }
    if (opts?.renamedFrom && opts?.renamedTo && opts.renamedFrom !== opts.renamedTo) {
      const from = opts.renamedFrom, to = opts.renamedTo;
      const migrate = (prev: InventoryTurnData): InventoryTurnData => {
        if (!prev.products[from]) return prev;
        const c = { ...prev.products };
        c[to] = c[from];
        delete c[from];
        return { ...prev, products: c };
      };
      setT1(migrate);
      setT2(migrate);
    }
    if (opts?.added) {
      const name = opts.added.name;
      setT1((prev) => prev.products[name] ? prev : ({ ...prev, products: { ...prev.products, [name]: emptyProduct() } }));
      setT2((prev) => prev.products[name] ? prev : ({ ...prev, products: { ...prev.products, [name]: emptyProduct() } }));
    }
  };

  const addCoffee = () => {
    const name = newCoffeeName.trim();
    if (!name) return;
    setCurrentTurn((prev) => ({ ...prev, coffee: { ...prev.coffee, [name]: 0 } }));
    setNewCoffeeName("");
  };

  const setCoffee = (name: string, qty: number) =>
    setCurrentTurn((prev) => ({ ...prev, coffee: { ...prev.coffee, [name]: qty } }));

  const removeCoffee = (name: string) =>
    setCurrentTurn((prev) => { const c = { ...prev.coffee }; delete c[name]; return { ...prev, coffee: c }; });

  const addShpenzim = () =>
    setCurrentTurn((prev) => ({ ...prev, shpenzime: [...prev.shpenzime, { emertimi: "", vlera: 0 }] }));

  const updateShpenzim = (idx: number, field: "emertimi" | "vlera", value: string | number) =>
    setCurrentTurn((prev) => {
      const arr = prev.shpenzime.slice();
      arr[idx] = { ...arr[idx], [field]: value as any };
      return { ...prev, shpenzime: arr };
    });

  const removeShpenzim = (idx: number) =>
    setCurrentTurn((prev) => ({ ...prev, shpenzime: prev.shpenzime.filter((_, i) => i !== idx) }));

  const closeT1 = async () => {
    if (turn1ClosedAt && !confirm(`Turni 1 është mbyllur më ${new Date(turn1ClosedAt).toLocaleString("sq-AL", { timeZone: "Europe/Rome" })}. Rilogariti?`)) return;
    if (!turn1ClosedAt && !confirm("Mbyll Turnin 1 dhe mbush 'Shiriti' nga shitjet e POS-it?")) return;
    setClosingT1(true);
    try {
      const fromISO = Sales.romeStartOfDayISO(date);
      const toISO = new Date().toISOString();
      const map = await Sales.aggregateSalesByProduct(fromISO, toISO, products);
      const updatedT1: InventoryTurnData = {
        ...t1,
        products: { ...t1.products },
      };
      products.forEach((p) => {
        const existing = updatedT1.products[p.name] || emptyProduct();
        updatedT1.products[p.name] = { ...existing, shiriti: map[p.name] || 0 };
      });
      setT1(updatedT1);
      const { error } = await (supabase as any)
        .from("inv_daily_entries")
        .upsert(
          { entry_date: date, turn1_data: updatedT1, turn2_data: t2, turn1_closed_at: toISO, updated_at: new Date().toISOString() },
          { onConflict: "entry_date" },
        );
      if (error) throw error;
      setTurn1ClosedAt(toISO);
      toast.success("Turni 1 u mbyll. Shiriti u mbush automatikisht.");
    } catch (e: any) {
      toast.error("Mbyllja e T1 dështoi: " + (e.message || e));
    } finally {
      setClosingT1(false);
    }
  };

  const closeDay = async () => {
    if (!confirm("Mbyll ditën dhe llogarit stokun për ditën pasardhëse?")) return;
    setClosing(true);
    try {
      // Auto-fill T2 shiriti from POS sales between turn1_closed_at and now
      let updatedT2 = t2;
      if (turn1ClosedAt) {
        const map = await Sales.aggregateSalesByProduct(turn1ClosedAt, new Date().toISOString(), products);
        updatedT2 = { ...t2, products: { ...t2.products } };
        products.forEach((p) => {
          const existing = updatedT2.products[p.name] || emptyProduct();
          updatedT2.products[p.name] = { ...existing, shiriti: map[p.name] || 0 };
        });
        setT2(updatedT2);
        await (supabase as any)
          .from("inv_daily_entries")
          .upsert(
            { entry_date: date, turn1_data: t1, turn2_data: updatedT2, turn1_closed_at: turn1ClosedAt, updated_at: new Date().toISOString() },
            { onConflict: "entry_date" },
          );
      }
      const { stock, mulliriFillim } = Prop.computeNextDayStock(updatedT2, t1);
      const nextDate = shiftIso(date, 1);
      await Prop.persistNextDayStock(nextDate, stock, mulliriFillim);
      toast.success(`Dita u mbyll. Stoku i ${nextDate} u ruajt.`);
    } catch (e: any) {
      toast.error("Mbyllja dështoi: " + (e.message || e));
    } finally {
      setClosing(false);
    }
  };

  const totalCoffee = useMemo(() => Calc.calculateTotalCoffee(currentTurn), [currentTurn]);
  const mulliriDif = useMemo(
    () => Calc.calculateMulliriDif(currentTurn.mulliriFillim, currentTurn.mulliriPerfund, totalCoffee),
    [currentTurn, totalCoffee],
  );
  const totalShpenzime = useMemo(() => Calc.calculateTotalShpenzime(currentTurn), [currentTurn]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-slate-800" aria-label="Kthehu">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Boxes size={20} /> Regjistrimi Ditor
            </h1>
            <p className="text-xs text-slate-400">{staffName ? `${staffName} · ` : ""}{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white h-9 w-[150px]"
          />
          {saving && <span className="text-xs text-slate-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> ruaj…</span>}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Duke ngarkuar…
        </div>
      ) : (
        <div className="p-4 max-w-5xl mx-auto space-y-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="bg-slate-900 border border-slate-800">
              <TabsTrigger value="t1">Turni 1</TabsTrigger>
              <TabsTrigger value="t2">Turni 2</TabsTrigger>
            </TabsList>

            {(["t1", "t2"] as const).map((k) => (
              <TabsContent key={k} value={k} className="space-y-6 mt-4">
                {/* Products */}
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2"><Package2 size={16}/> Produktet</h2>
                    <ProductManagerDialog
                      products={products}
                      onChanged={handleProductsChanged}
                      trigger={
                        <Button size="sm" className="bg-slate-800 hover:bg-slate-700 h-8">
                          <Settings2 size={14} className="mr-1"/> Menaxho
                        </Button>
                      }
                    />
                  </div>

                  {products.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Asnjë produkt. Shto nga "Menaxho".</p>
                  ) : (
                    <div className="space-y-3">
                      {products.map((p) => {
                        const data = (k === "t1" ? t1 : t2).products[p.name] || emptyProduct();
                        const dif = Calc.calculateDif(data);
                        return (
                          <div key={p.id} className="border border-slate-800 rounded-lg p-3 bg-slate-950/60">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{p.name}</div>
                              <div className={`text-sm font-bold tabular-nums ${difColor(dif)}`}>
                                Dif: {dif > 0 ? "+" : ""}{dif.toFixed(2)}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <Field label="Stok Fillim" value={data.stokFillim} readOnly />
                              <Field
                                label="Furnizime"
                                value={data.furnizime}
                                onChange={(v) => (k === "t1" ? setT1 : setT2)((prev) => ({
                                  ...prev,
                                  products: { ...prev.products, [p.name]: { ...(prev.products[p.name] || emptyProduct()), furnizime: v } },
                                }))}
                              />
                              <Field
                                label="Gjendje"
                                value={data.gjendje}
                                onChange={(v) => (k === "t1" ? setT1 : setT2)((prev) => ({
                                  ...prev,
                                  products: { ...prev.products, [p.name]: { ...(prev.products[p.name] || emptyProduct()), gjendje: v } },
                                }))}
                              />
                              <Field
                                label="Shiriti"
                                value={data.shiriti}
                                onChange={(v) => (k === "t1" ? setT1 : setT2)((prev) => ({
                                  ...prev,
                                  products: { ...prev.products, [p.name]: { ...(prev.products[p.name] || emptyProduct()), shiriti: v } },
                                }))}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Coffee */}
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2"><Coffee size={16}/> Kafet</h2>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newCoffeeName}
                        onChange={(e) => setNewCoffeeName(e.target.value)}
                        placeholder="Lloji"
                        className="bg-slate-950 border-slate-700 text-white h-8 w-40"
                      />
                      <Button size="sm" onClick={addCoffee} className="bg-emerald-600 hover:bg-emerald-500 h-8">
                        <Plus size={14} className="mr-1"/> Shto
                      </Button>
                    </div>
                  </div>
                  {Object.keys(currentTurn.coffee).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Asnjë lloj kafeje.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(currentTurn.coffee).map(([name, qty]) => (
                        <div key={name} className="flex items-center gap-2 border border-slate-800 rounded p-2 bg-slate-950/60">
                          <span className="flex-1 truncate">{name}</span>
                          <Input
                            type="number"
                            value={qty}
                            onChange={(e) => setCoffee(name, Number(e.target.value) || 0)}
                            className="bg-slate-950 border-slate-700 text-white h-8 w-24 text-right"
                          />
                          <button onClick={() => removeCoffee(name)} className="text-slate-500 hover:text-rose-400">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 text-sm text-slate-400">Total kafe: <span className="font-bold text-white">{totalCoffee}</span></div>
                </Card>

                {/* Mulliri */}
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <h2 className="font-semibold mb-3">Mulliri</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field
                      label="Fillim"
                      value={currentTurn.mulliriFillim}
                      onChange={(v) => setCurrentTurn((prev) => ({ ...prev, mulliriFillim: v }))}
                    />
                    <Field
                      label="Përfund"
                      value={currentTurn.mulliriPerfund}
                      onChange={(v) => setCurrentTurn((prev) => ({ ...prev, mulliriPerfund: v }))}
                    />
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Dif</div>
                      <div className={`h-9 flex items-center px-3 rounded border border-slate-800 bg-slate-950 font-bold tabular-nums ${difColor(mulliriDif)}`}>
                        {mulliriDif > 0 ? "+" : ""}{mulliriDif.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Dif = TotalKafe − (Përfund − Fillim)</p>
                </Card>

                {/* Xhiro + Shpenzime */}
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Xhiro (Lekë)</div>
                      <Input
                        type="number"
                        value={currentTurn.xhiro}
                        onChange={(e) => setCurrentTurn((prev) => ({ ...prev, xhiro: Number(e.target.value) || 0 }))}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-slate-400">Shpenzime · Total {totalShpenzime.toFixed(0)}</div>
                        <Button size="sm" onClick={addShpenzim} className="bg-slate-800 hover:bg-slate-700 h-7">
                          <Plus size={12} className="mr-1"/> Shto
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {currentTurn.shpenzime.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              value={s.emertimi}
                              onChange={(e) => updateShpenzim(i, "emertimi", e.target.value)}
                              placeholder="Emërtimi"
                              className="bg-slate-950 border-slate-700 text-white h-8 flex-1"
                            />
                            <Input
                              type="number"
                              value={s.vlera}
                              onChange={(e) => updateShpenzim(i, "vlera", Number(e.target.value) || 0)}
                              className="bg-slate-950 border-slate-700 text-white h-8 w-28 text-right"
                            />
                            <button onClick={() => removeShpenzim(i)} className="text-slate-500 hover:text-rose-400">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={closeT1}
              disabled={closingT1}
              variant="secondary"
              className="bg-sky-700 hover:bg-sky-600 text-white"
            >
              {closingT1 ? <Loader2 className="animate-spin mr-2" size={16}/> : <Clock size={16} className="mr-2"/>}
              {turn1ClosedAt ? "Rimbush Shiritin T1" : "Mbyll Turnin 1"}
            </Button>
            <Button
              onClick={closeDay}
              disabled={closing}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {closing ? <Loader2 className="animate-spin mr-2" size={16}/> : <Lock size={16} className="mr-2"/>}
              Mbyll ditën
            </Button>
          </div>
          {turn1ClosedAt && (
            <p className="text-xs text-slate-500 text-right">
              T1 u mbyll: {new Date(turn1ClosedAt).toLocaleString("sq-AL", { timeZone: "Europe/Rome" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface FieldProps {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}
const Field = ({ label, value, onChange, readOnly }: FieldProps) => (
  <div>
    <div className="text-xs text-slate-400 mb-1">{label}</div>
    <Input
      type="number"
      value={value}
      readOnly={readOnly}
      onChange={onChange ? (e) => onChange(Number(e.target.value) || 0) : undefined}
      className={`bg-slate-950 border-slate-700 text-white h-9 text-right tabular-nums ${readOnly ? "opacity-70 cursor-not-allowed" : ""}`}
    />
  </div>
);

export default RegjistrimiDitor;