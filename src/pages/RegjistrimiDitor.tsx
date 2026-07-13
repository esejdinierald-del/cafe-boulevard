import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { inventorySupabase as supabase } from "@/integrations/supabase/inventory-client";
import { supabase as mainSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2, Package2, Coffee, Lock, Boxes, Settings2, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
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
import { useDifStartDates } from "@/hooks/useDifStartDates";

type InvProduct = InvProductRow;

interface ShiftTurn {
  id: string;
  entry_date: string;
  staff_name: string;
  sequence_number: number;
  turn_data: InventoryTurnData;
  started_at: string;
  locked_at: string | null;
  is_locked: boolean;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [guardChecking, setGuardChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closingTurn, setClosingTurn] = useState(false);
  const [confirmingGjendje, setConfirmingGjendje] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [products, setProducts] = useState<InvProduct[]>([]);
  const [turns, setTurns] = useState<ShiftTurn[]>([]);
  const [myTurnId, setMyTurnId] = useState<string | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [newCoffeeName, setNewCoffeeName] = useState("");

  const staffName = (typeof window !== "undefined" ? localStorage.getItem("staff_name") : null) || "";

  // Guard: same shift-token system as /staff.
  // Read token from URL (?token=...) or localStorage, validate via validate-shift edge fn.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const urlToken = searchParams.get("token");
      if (urlToken) {
        localStorage.setItem("staff_shift_token", urlToken);
        setSearchParams({}, { replace: true });
      }
      const token = urlToken || localStorage.getItem("staff_shift_token");
      if (!token) {
        navigate("/staff", { replace: true });
        return;
      }
      try {
        const { data, error } = await mainSupabase.functions.invoke("validate-shift", {
          body: { token },
        });
        if (cancelled) return;
        if (error || !data?.valid) {
          localStorage.removeItem("staff_shift_token");
          navigate("/staff", { replace: true });
          return;
        }
        setGuardChecking(false);
      } catch {
        if (cancelled) return;
        navigate("/staff", { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Initial load — dynamic shift_turns
  useEffect(() => {
    if (guardChecking) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: prods }, { data: existingTurns, error: turnsErr }, seed] = await Promise.all([
          (supabase as any).from("inv_products").select("id, name, sort_order, menu_item_ids, units_per_sale").order("sort_order").order("name"),
          (supabase as any).from("shift_turns").select("*").eq("entry_date", date).order("sequence_number"),
          Prop.loadNextDayStockFor(date),
        ]);
        if (turnsErr) throw turnsErr;
        const productList = (prods || []) as InvProduct[];
        setProducts(productList);

        const existing: ShiftTurn[] = ((existingTurns || []) as any[]).map((r) => ({
          ...r,
          turn_data: { ...emptyTurn(), ...(r.turn_data || {}) },
        }));

        // Fill product entries for every turn from products list.
        existing.forEach((t, idx) => {
          productList.forEach((p) => {
            if (!t.turn_data.products[p.name]) {
              const prevPrev = idx === 0
                ? emptyProduct(seed?.stock?.[p.name] ?? 0)
                : existing[idx - 1].turn_data.products[p.name] || emptyProduct();
              const stokFillim = idx === 0
                ? (seed?.stock?.[p.name] ?? 0)
                : Calc.calculateStockForNextTurn(prevPrev);
              t.turn_data.products[p.name] = emptyProduct(stokFillim);
            }
          });
          if (idx === 0 && !t.turn_data.mulliriFillim && seed?.mulliriFillim) {
            t.turn_data.mulliriFillim = seed.mulliriFillim;
          }
        });

        // Determine "my turn" — ownership rule.
        let list = existing;
        const last = list[list.length - 1];
        let mineId: string;

        if (!last || last.is_locked) {
          // Create new turn seq = last+1 with propagated Stok Fillim / Mulliri Fillim.
          const nextSeq = last ? last.sequence_number + 1 : 1;
          const seedTurn: InventoryTurnData = emptyTurn();
          productList.forEach((p) => {
            const prev = last?.turn_data.products[p.name];
            const stokFillim = prev
              ? Calc.calculateStockForNextTurn(prev)
              : (seed?.stock?.[p.name] ?? 0);
            seedTurn.products[p.name] = emptyProduct(stokFillim);
          });
          seedTurn.mulliriFillim = last ? last.turn_data.mulliriPerfund : (seed?.mulliriFillim ?? 0);

          const { data: inserted, error: insErr } = await (supabase as any)
            .from("shift_turns")
            .insert({
              entry_date: date,
              staff_name: staffName || "Panjohur",
              sequence_number: nextSeq,
              turn_data: seedTurn,
            })
            .select()
            .single();
          if (insErr) throw insErr;
          const newTurn: ShiftTurn = { ...inserted, turn_data: { ...emptyTurn(), ...(inserted.turn_data || seedTurn) } };
          list = [...list, newTurn];
          mineId = newTurn.id;
        } else if (staffName && last.staff_name !== staffName) {
          // Take ownership of unlocked turn.
          const { error: updErr } = await (supabase as any)
            .from("shift_turns")
            .update({ staff_name: staffName })
            .eq("id", last.id);
          if (updErr) throw updErr;
          list = list.map((t) => (t.id === last.id ? { ...t, staff_name: staffName } : t));
          mineId = last.id;
        } else {
          mineId = last.id;
        }

        setTurns(list);
        setMyTurnId(mineId);
        setSelectedTurnId(mineId);
        await backupToDailyEntries(list);
      } catch (e: any) {
        toast.error(e.message || "Gabim ngarkimi");
      } finally {
        setLoading(false);
      }
    })();
  }, [date, guardChecking]);

  const backupToDailyEntries = async (list: ShiftTurn[]) => {
    if (!list.length) return;
    const first = list[0].turn_data;
    const last = list[list.length - 1].turn_data;
    try {
      await (supabase as any)
        .from("inv_daily_entries")
        .upsert(
          {
            entry_date: date,
            turn1_data: first,
            turn2_data: last,
            turn1_closed_at: list[0].locked_at,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entry_date" },
        );
    } catch {
      /* backup best-effort */
    }
  };

  const selectedTurn = useMemo(
    () => turns.find((t) => t.id === selectedTurnId) || null,
    [turns, selectedTurnId],
  );
  const isMine = selectedTurn?.id === myTurnId && !selectedTurn?.is_locked;
  const currentTurn = selectedTurn?.turn_data ?? emptyTurn();

  // Update helper: mutates the selected turn's turn_data locally (only when editable).
  const setCurrentTurn = (updater: (prev: InventoryTurnData) => InventoryTurnData) => {
    if (!selectedTurn || !isMine) return;
    setTurns((prev) =>
      prev.map((t) => (t.id === selectedTurn.id ? { ...t, turn_data: updater(t.turn_data) } : t)),
    );
  };

  // Debounced autosave for MY turn only.
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (loading || !selectedTurn || !isMine) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const payload = selectedTurn.turn_data;
    const id = selectedTurn.id;
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const { error } = await (supabase as any)
          .from("shift_turns")
          .update({ turn_data: payload })
          .eq("id", id);
        if (error) throw error;
      } catch (e: any) {
        toast.error("Ruajtja dështoi: " + (e.message || e));
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [selectedTurn?.turn_data, selectedTurn?.id, isMine, loading]);

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
    const patchTurn = (td: InventoryTurnData): InventoryTurnData => {
      let c = { ...td.products };
      if (opts?.deletedName) delete c[opts.deletedName];
      if (opts?.renamedFrom && opts?.renamedTo && opts.renamedFrom !== opts.renamedTo && c[opts.renamedFrom]) {
        c[opts.renamedTo] = c[opts.renamedFrom];
        delete c[opts.renamedFrom];
      }
      if (opts?.added && !c[opts.added.name]) c[opts.added.name] = emptyProduct();
      return { ...td, products: c };
    };
    setTurns((prev) => prev.map((t) => ({ ...t, turn_data: patchTurn(t.turn_data) })));
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

  const closeMyTurn = async () => {
    if (!selectedTurn || !isMine) return;
    if (!confirm("Mbyll turnin tënd? Shiriti mbushet nga shitjet e POS-it dhe turni kyçet.")) return;
    setClosingTurn(true);
    try {
      const fromISO = selectedTurn.started_at;
      const toISO = new Date().toISOString();
      const map = await Sales.aggregateSalesByProduct(fromISO, toISO, products);
      const updated: InventoryTurnData = { ...selectedTurn.turn_data, products: { ...selectedTurn.turn_data.products } };
      products.forEach((p) => {
        const existing = updated.products[p.name] || emptyProduct();
        updated.products[p.name] = { ...existing, shiriti: map[p.name] || 0 };
      });
      const { error } = await (supabase as any)
        .from("shift_turns")
        .update({ turn_data: updated, is_locked: true, locked_at: toISO })
        .eq("id", selectedTurn.id);
      if (error) throw error;
      const newList = turns.map((t) =>
        t.id === selectedTurn.id ? { ...t, turn_data: updated, is_locked: true, locked_at: toISO } : t,
      );
      setTurns(newList);
      setMyTurnId(null);
      await backupToDailyEntries(newList);
      toast.success("Turni yt u mbyll.");
    } catch (e: any) {
      toast.error("Mbyllja e turnit dështoi: " + (e.message || e));
    } finally {
      setClosingTurn(false);
    }
  };

  const closeDay = async () => {
    if (!turns.length) return;
    if (!confirm("Mbyll ditën dhe llogarit stokun për ditën pasardhëse?")) return;
    setClosing(true);
    try {
      const last = turns[turns.length - 1];
      const prev = turns.length > 1 ? turns[turns.length - 2] : null;
      const { stock, mulliriFillim } = Prop.computeNextDayStock(
        last.turn_data,
        prev?.turn_data ?? last.turn_data,
      );
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

  const productNames = useMemo(() => products.map((p) => p.name), [products]);
  const difStartMap = useDifStartDates(productNames, date);

  // Furnizime handler: shto/zbrit delta te stokFillim
  const setFurnizime = (productName: string, newVal: number) => {
    setCurrentTurn((prev) => {
      const existing = prev.products[productName] || emptyProduct();
      const oldVal = existing.furnizime || 0;
      const delta = newVal - oldVal;
      return {
        ...prev,
        products: {
          ...prev.products,
          [productName]: {
            ...existing,
            furnizime: newVal,
            stokFillim: (existing.stokFillim || 0) + delta,
          },
        },
      };
    });
  };

  // Kopjo në turnin pasardhës (të së njëjtës datë)
  const copyToNextTurn = async () => {
    if (!selectedTurn) return;
    const idx = turns.findIndex((t) => t.id === selectedTurn.id);
    const next = turns[idx + 1];
    if (!next) return toast.error("S'ka turn pasardhës.");
    if (next.is_locked) return toast.error("Turni pasardhës është i kyçur.");
    const merged = Prop.syncT1ToT2(selectedTurn.turn_data, next.turn_data);
    try {
      const { error } = await (supabase as any)
        .from("shift_turns").update({ turn_data: merged }).eq("id", next.id);
      if (error) throw error;
      setTurns((prev) => prev.map((t) => t.id === next.id ? { ...t, turn_data: merged } : t));
      toast.success("Të dhënat u kopjuan te turni pasardhës.");
    } catch (e: any) { toast.error(e.message || "Dështoi"); }
  };

  // Rivendos stokun nga Gjendja (admin-only)
  const rebaseFromGjendje = async () => {
    const pass = prompt("Fjalëkalimi i adminit:");
    if (pass !== "2025") return toast.error("Fjalëkalim i pasaktë.");
    if (!confirm("Rivendos stokun e ditës pasardhëse duke përdorur 'Gjendja' aktuale?")) return;
    try {
      const last = turns[turns.length - 1];
      const prev = turns.length > 1 ? turns[turns.length - 2] : last;
      const { stock, mulliriFillim } = Prop.computeNextDayStockFromGjendje(last.turn_data, prev.turn_data);
      const nextDate = shiftIso(date, 1);
      await Prop.persistNextDayStock(nextDate, stock, mulliriFillim);
      toast.success(`Stoku i ${nextDate} u rivendos nga Gjendja.`);
    } catch (e: any) { toast.error(e.message || "Dështoi"); }
  };

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

      {guardChecking || loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Duke ngarkuar…
        </div>
      ) : !selectedTurn ? (
        <div className="p-6 text-center text-slate-400">S'ka turne për këtë datë.</div>
      ) : (
        <div className="p-4 max-w-5xl mx-auto space-y-6">
          <Tabs value={selectedTurnId ?? ""} onValueChange={(v) => setSelectedTurnId(v)}>
            <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto">
              {turns.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="gap-1">
                  #{t.sequence_number} {t.staff_name}
                  {t.is_locked && <Lock size={10} className="opacity-60"/>}
                </TabsTrigger>
              ))}
            </TabsList>

            {turns.map((t) => {
              const editable = t.id === myTurnId && !t.is_locked;
              return (
              <TabsContent key={t.id} value={t.id} className="space-y-6 mt-4">
                {!editable && (
                  <div className="text-xs text-amber-400 flex items-center gap-2">
                    <Lock size={12}/> Vetëm-lexim{t.is_locked && t.locked_at ? ` · kyçur ${new Date(t.locked_at).toLocaleString("sq-AL", { timeZone: "Europe/Rome" })}` : ""}
                  </div>
                )}
                {/* Products */}
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2"><Package2 size={16}/> Produktet</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      {editable && (
                        <>
                          <Button size="sm" onClick={copyToNextTurn} className="bg-slate-800 hover:bg-slate-700 h-8">
                            Kopjo në turnin pasardhës →
                          </Button>
                          <Button size="sm" onClick={rebaseFromGjendje} className="bg-amber-700 hover:bg-amber-600 h-8">
                            Rivendos nga Gjendja
                          </Button>
                        </>
                      )}
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
                  </div>

                  {products.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Asnjë produkt. Shto nga "Menaxho".</p>
                  ) : (
                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="w-full text-sm border-collapse min-w-[720px]">
                        <thead>
                          <tr className="text-xs text-slate-400 border-b border-slate-800">
                            <th className="text-left py-2 pr-2 font-medium">Produkti</th>
                            <th className="text-right py-2 px-2 font-medium">Stok Fillim</th>
                            <th className="text-right py-2 px-2 font-medium">Gjendje</th>
                            <th className="text-right py-2 px-2 font-medium">Shiriti</th>
                            <th className="text-right py-2 px-2 font-medium">Furnizime</th>
                            <th className="text-right py-2 px-2 font-medium">Dif</th>
                            <th className="text-right py-2 pl-2 font-medium">Dif fillon</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p) => {
                            const data = t.turn_data.products[p.name] || emptyProduct();
                            const dif = Calc.calculateDif(data);
                            const difStart = difStartMap[p.name] || null;
                            return (
                              <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-950/40">
                                <td className="py-1.5 pr-2 font-medium">{p.name}</td>
                                <td className="py-1.5 px-1">
                                  <RowField value={data.stokFillim} readOnly />
                                </td>
                                <td className="py-1.5 px-1">
                                  <RowField
                                    value={data.gjendje}
                                    readOnly={!editable}
                                    onChange={(v) => setCurrentTurn((prev) => ({
                                      ...prev,
                                      products: { ...prev.products, [p.name]: { ...(prev.products[p.name] || emptyProduct()), gjendje: v } },
                                    }))}
                                  />
                                </td>
                                <td className="py-1.5 px-1">
                                  <RowField value={data.shiriti} readOnly />
                                </td>
                                <td className="py-1.5 px-1">
                                  <RowField
                                    value={data.furnizime}
                                    readOnly={!editable}
                                    onChange={(v) => setFurnizime(p.name, v)}
                                  />
                                </td>
                                <td className={`py-1.5 px-2 text-right font-bold tabular-nums ${difColor(dif)}`}>
                                  {dif > 0 ? "+" : ""}{dif.toFixed(2)}
                                </td>
                                <td className="py-1.5 pl-2 text-right text-xs text-slate-400 tabular-nums">
                                  {difStart || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Coffee */}
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2"><Coffee size={16}/> Kafet</h2>
                    {editable && <div className="flex items-center gap-2">
                      <Input
                        value={newCoffeeName}
                        onChange={(e) => setNewCoffeeName(e.target.value)}
                        placeholder="Lloji"
                        className="bg-slate-950 border-slate-700 text-white h-8 w-40"
                      />
                      <Button size="sm" onClick={addCoffee} className="bg-emerald-600 hover:bg-emerald-500 h-8">
                        <Plus size={14} className="mr-1"/> Shto
                      </Button>
                    </div>}
                  </div>
                  {Object.keys(t.turn_data.coffee).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Asnjë lloj kafeje.</p>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-800">
                          <th className="text-left py-2 pr-2 font-medium">Lloji</th>
                          <th className="text-right py-2 pl-2 font-medium">Sasia</th>
                          {editable && <th className="w-8" />}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(t.turn_data.coffee).map(([name, qty]) => (
                          <tr key={name} className="border-b border-slate-800/60">
                            <td className="py-1.5 pr-2 truncate">{name}</td>
                            <td className="py-1.5 pl-2">
                              <RowField
                                value={qty}
                                readOnly={!editable}
                                onChange={(v) => setCoffee(name, v)}
                              />
                            </td>
                            {editable && (
                              <td className="py-1.5 pl-1">
                                <button onClick={() => removeCoffee(name)} className="text-slate-500 hover:text-rose-400">
                                  <Trash2 size={14}/>
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-700 bg-slate-950/40">
                          <td className="py-2 pr-2 font-bold">TOTALI</td>
                          <td className="py-2 pl-2 text-right font-bold tabular-nums">{totalCoffee}</td>
                          {editable && <td />}
                        </tr>
                      </tbody>
                    </table>
                  )}
                </Card>

                {/* Mulliri */}
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <h2 className="font-semibold mb-3">Mulliri</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Field
                      label="Fillim"
                      value={t.turn_data.mulliriFillim}
                      readOnly={!editable}
                      onChange={(v) => setCurrentTurn((prev) => ({ ...prev, mulliriFillim: v }))}
                    />
                    <Field
                      label="Përfund"
                      value={t.turn_data.mulliriPerfund}
                      readOnly={!editable}
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
                        value={t.turn_data.xhiro}
                        readOnly={!editable}
                        onChange={(e) => setCurrentTurn((prev) => ({ ...prev, xhiro: Number(e.target.value) || 0 }))}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-slate-400">Shpenzime · Total {totalShpenzime.toFixed(0)}</div>
                        {editable && <Button size="sm" onClick={addShpenzim} className="bg-slate-800 hover:bg-slate-700 h-7">
                          <Plus size={12} className="mr-1"/> Shto
                        </Button>}
                      </div>
                      <div className="space-y-2">
                        {t.turn_data.shpenzime.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              value={s.emertimi}
                              readOnly={!editable}
                              onChange={(e) => updateShpenzim(i, "emertimi", e.target.value)}
                              placeholder="Emërtimi"
                              className="bg-slate-950 border-slate-700 text-white h-8 flex-1"
                            />
                            <Input
                              type="number"
                              value={s.vlera}
                              readOnly={!editable}
                              onChange={(e) => updateShpenzim(i, "vlera", Number(e.target.value) || 0)}
                              className="bg-slate-950 border-slate-700 text-white h-8 w-28 text-right"
                            />
                            {editable && <button onClick={() => removeShpenzim(i)} className="text-slate-500 hover:text-rose-400">
                              <Trash2 size={14}/>
                            </button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
              );
            })}
          </Tabs>

          <div className="flex flex-wrap justify-end gap-2">
            {isMine && (
              <Button
                onClick={closeMyTurn}
                disabled={closingTurn}
                variant="secondary"
                className="bg-sky-700 hover:bg-sky-600 text-white"
              >
                {closingTurn ? <Loader2 className="animate-spin mr-2" size={16}/> : <Clock size={16} className="mr-2"/>}
                Mbyll turnin tim
              </Button>
            )}
            <Button
              onClick={closeDay}
              disabled={closing}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {closing ? <Loader2 className="animate-spin mr-2" size={16}/> : <Lock size={16} className="mr-2"/>}
              Mbyll ditën
            </Button>
          </div>
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

const RowField = ({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) => (
  <Input
    type="number"
    step="0.01"
    value={value}
    readOnly={readOnly}
    onChange={onChange ? (e) => onChange(Number(e.target.value) || 0) : undefined}
    className={`bg-slate-950 border-slate-700 text-white h-8 text-right tabular-nums w-full min-w-[80px] ${readOnly ? "opacity-70 cursor-not-allowed" : ""}`}
  />
);

export default RegjistrimiDitor;