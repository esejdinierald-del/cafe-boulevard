import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { inventorySupabase as supabase } from "@/integrations/supabase/inventory-client";
import { supabase as mainSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2, Package2, Coffee, Lock, Boxes, Settings2, Clock, CheckCircle2, ShieldCheck, Camera } from "lucide-react";
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
import { useCoffeeSalesTotal } from "@/hooks/useCoffeeSalesTotal";

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
  const [openingGjendje, setOpeningGjendje] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [products, setProducts] = useState<InvProduct[]>([]);
  const [turns, setTurns] = useState<ShiftTurn[]>([]);
  const [myTurnId, setMyTurnId] = useState<string | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [newCoffeeName, setNewCoffeeName] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() =>
    typeof window !== "undefined" && sessionStorage.getItem("inv_admin_unlocked") === "1"
  );
  const [productMgrOpen, setProductMgrOpen] = useState(false);

  const requestAdminAccess = () => {
    if (adminUnlocked) { setProductMgrOpen(true); return; }
    const pass = window.prompt("Fjalëkalimi i administratorit për menaxhimin e produkteve:");
    if (pass === null) return;
    if (pass !== "2025") { toast.error("Fjalëkalim i pasaktë"); return; }
    sessionStorage.setItem("inv_admin_unlocked", "1");
    setAdminUnlocked(true);
    setProductMgrOpen(true);
  };

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

  // ---------- Confirm gjendje for the active turn ----------
  // Reveal Gjendje input column
  const openGjendjeInput = async () => {
    if (!selectedTurn || !isMine) return;
    if (selectedTurn.turn_data.gjendjeInputAt) return;
    setOpeningGjendje(true);
    try {
      const now = new Date().toISOString();
      const updated: InventoryTurnData = { ...selectedTurn.turn_data, gjendjeInputAt: now };
      const { error } = await (supabase as any)
        .from("shift_turns")
        .update({ turn_data: updated })
        .eq("id", selectedTurn.id);
      if (error) throw error;
      setTurns((prev) => prev.map((t) => (t.id === selectedTurn.id ? { ...t, turn_data: updated } : t)));
    } catch (e: any) {
      toast.error("Dështoi: " + (e.message || e));
    } finally {
      setOpeningGjendje(false);
    }
  };

  const confirmGjendje = async () => {
    if (!selectedTurn || !isMine) return;
    if (selectedTurn.turn_data.gjendjeConfirmedAt) return;
    const hasAnyGjendje = Object.values(selectedTurn.turn_data.products).some(
      (p) => (p.gjendje || 0) > 0,
    );
    if (!hasAnyGjendje) {
      if (!confirm("Asnjë produkt s'ka gjendje reale të plotësuar. Konfirmo prapëseprapë?")) return;
    } else if (!confirm("Konfirmo gjendjen reale? Furnizime dhe Gjendja bllokohen; Stok Fillim & Dif bëhen të dukshme.")) {
      return;
    }
    setConfirmingGjendje(true);
    try {
      const now = new Date().toISOString();
      const updated: InventoryTurnData = { ...selectedTurn.turn_data, gjendjeConfirmedAt: now };
      const { error } = await (supabase as any)
        .from("shift_turns")
        .update({ turn_data: updated })
        .eq("id", selectedTurn.id);
      if (error) throw error;
      setTurns((prev) => prev.map((t) => (t.id === selectedTurn.id ? { ...t, turn_data: updated } : t)));
      toast.success("Gjendja u konfirmua.");
    } catch (e: any) {
      toast.error("Dështoi: " + (e.message || e));
    } finally {
      setConfirmingGjendje(false);
    }
  };

  // ---------- Live Shiriti: re-aggregate from POS whenever a transaction changes ----------
  useEffect(() => {
    if (guardChecking || loading || !myTurnId) return;
    const mine = turns.find((t) => t.id === myTurnId);
    if (!mine || mine.is_locked || products.length === 0) return;

    let cancelled = false;
    let debounce: number | null = null;

    const refreshShiriti = async () => {
      try {
        const fromISO = mine.started_at;
        const toISO = new Date().toISOString();
        const map = await Sales.aggregateSalesByProduct(fromISO, toISO, products);
        if (cancelled) return;
        setTurns((prev) => prev.map((t) => {
          if (t.id !== myTurnId) return t;
          const nextProducts = { ...t.turn_data.products };
          products.forEach((p) => {
            const existing = nextProducts[p.name] || emptyProduct();
            nextProducts[p.name] = { ...existing, shiriti: map[p.name] || 0 };
          });
          return { ...t, turn_data: { ...t.turn_data, products: nextProducts } };
        }));
      } catch { /* silent */ }
    };

    // Initial fetch
    refreshShiriti();

    const scheduleRefresh = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(refreshShiriti, 700);
    };

    // Realtime listener on transactions (main backend)
    const channel = mainSupabase
      .channel(`shiriti-live-${myTurnId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, scheduleRefresh)
      .subscribe();

    // Fallback poll every 20s in case realtime misses
    const poll = window.setInterval(refreshShiriti, 20000);

    return () => {
      cancelled = true;
      if (debounce) window.clearTimeout(debounce);
      window.clearInterval(poll);
      mainSupabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurnId, products, guardChecking, loading]);

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

  // ---------- Kafe Kryesor: auto-sum coffee menu-item sales (makiato, lece, ...) ----------
  const shiftFrom = selectedTurn?.started_at ?? null;
  const shiftTo = selectedTurn?.locked_at ?? new Date().toISOString();
  const [coffeeRefresh, setCoffeeRefresh] = useState(0);
  const { total: coffeeSalesAuto } = useCoffeeSalesTotal(shiftFrom, shiftTo, coffeeRefresh);
  // Refresh on POS transactions realtime + interval
  useEffect(() => {
    if (!selectedTurn || selectedTurn.is_locked) return;
    const ch = mainSupabase
      .channel(`coffee-auto-${selectedTurn.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" },
          () => setCoffeeRefresh((n) => n + 1))
      .subscribe();
    const iv = window.setInterval(() => setCoffeeRefresh((n) => n + 1), 20000);
    return () => { window.clearInterval(iv); mainSupabase.removeChannel(ch); };
  }, [selectedTurn?.id, selectedTurn?.is_locked]);

  // Formula: shitje kafe (POS) + mulliri fillim - mulliri perfundim
  const kafeKryesorDif =
    coffeeSalesAuto + (currentTurn.mulliriFillim || 0) - (currentTurn.mulliriPerfund || 0);

  // ---------- OCR mulliri perfund from photo ----------
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleScanFile = async (file: File) => {
    if (!selectedTurn || !isMine) return;
    setScanning(true);
    try {
      const b64: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] || "");
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { data, error } = await mainSupabase.functions.invoke("scan-mulliri", {
        body: { imageBase64: b64, mimeType: file.type || "image/jpeg" },
      });
      if (error) throw error;
      if (!data?.total) throw new Error(data?.error || "Nuk u lexua numri");
      setCurrentTurn((prev) => ({ ...prev, mulliriPerfund: Number(data.total) }));
      toast.success(`Mulliri Përfund: ${data.total}`);
    } catch (e: any) {
      toast.error("Skanimi dështoi: " + (e.message || e));
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
      <header className="sticky top-0 z-10 flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-slate-800 shrink-0" aria-label="Kthehu">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold flex items-center gap-1.5 truncate">
              <Boxes size={16} className="shrink-0" /> <span className="truncate">Regjistrimi Ditor</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">{staffName ? `${staffName} · ` : ""}{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white h-8 w-[120px] sm:w-[150px] text-xs px-2"
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
        <div className="p-2 sm:p-4 max-w-5xl mx-auto space-y-3 sm:space-y-6">
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
              const isConfirmed = !!t.turn_data.gjendjeConfirmedAt;
              const canEditGjendje = editable && !isConfirmed;
              // Before "Perfundova": only Gjendja column is visible (editable).
              // After confirm or on locked/read-only turns: Stok Fillim, Shiriti, Dif also visible.
              const showOtherCols = isConfirmed || !editable;
              return (
              <TabsContent key={t.id} value={t.id} className="space-y-6 mt-4">
                {!editable && (
                  <div className="text-xs text-amber-400 flex items-center gap-2">
                    <Lock size={12}/> Vetëm-lexim{t.is_locked && t.locked_at ? ` · kyçur ${new Date(t.locked_at).toLocaleString("sq-AL", { timeZone: "Europe/Rome" })}` : ""}
                  </div>
                )}
                {/* Products */}
                <Card className="bg-slate-900 border-slate-800 p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base"><Package2 size={14}/> Produktet</h2>
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
                      <Button
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700 h-8"
                        onClick={requestAdminAccess}
                      >
                        <ShieldCheck size={14} className="mr-1"/> Menaxho (Admin)
                      </Button>
                    </div>
                  </div>

                  {editable && (
                    isConfirmed ? (
                      <div className="mb-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
                        <ShieldCheck size={14}/>
                        Gjendja u konfirmua në {new Date(t.turn_data.gjendjeConfirmedAt!).toLocaleString("sq-AL", { timeZone: "Europe/Rome" })}. Stok Fillim, Shiriti dhe Dif janë të dukshme. Rregullo diferencat përmes POS-it nëse duhet.
                      </div>
                    ) : (
                      <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
                        Fut <b>Gjendjen reale</b> për çdo produkt. Kur të mbarosh, shtyp <b>Përfundova</b> për të parë Stok Fillim, Shiritin dhe Dif.
                      </div>
                    )
                  )}

                   {products.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Asnjë produkt. Shto nga "Menaxho".</p>
                  ) : (
                    <div className="overflow-x-auto -mx-2 sm:-mx-4 px-2 sm:px-4">
                      <table className="w-full text-xs sm:text-sm border-collapse min-w-[480px]">
                        <thead>
                          <tr className="text-[10px] sm:text-xs text-slate-400 border-b border-slate-800">
                            <th className="text-left py-1.5 pr-1 font-medium">Produkti</th>
                            {showOtherCols && <th className="text-right py-1.5 px-1 font-medium">Stok</th>}
                            {showOtherCols && <th className="text-right py-1.5 px-1 font-medium">Shirit</th>}
                            {showOtherCols && <th className="text-right py-1.5 px-1 font-medium">Dif</th>}
                            <th className="text-right py-1.5 px-1 font-medium">Gjendje</th>
                            <th className="text-right py-1.5 pl-1 font-medium">Fillon</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p) => {
                            const data = t.turn_data.products[p.name] || emptyProduct();
                            const dif = Calc.calculateDif(data);
                            const difStart = difStartMap[p.name] || null;
                            return (
                              <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-950/40">
                                <td className="py-1 pr-1 font-medium text-xs sm:text-sm">{p.name}</td>
                                {showOtherCols && (
                                  <td className="py-1 px-0.5">
                                    <RowField value={data.stokFillim} readOnly />
                                  </td>
                                )}
                                {showOtherCols && (
                                  <td className="py-1 px-0.5">
                                    <RowField value={data.shiriti} readOnly />
                                  </td>
                                )}
                                {showOtherCols && (
                                  <td className={`py-1 px-1 text-right font-bold tabular-nums text-xs sm:text-sm ${difColor(dif)}`}>
                                    {dif > 0 ? "+" : ""}{dif.toFixed(2)}
                                  </td>
                                )}
                                <td className="py-1 px-0.5">
                                  <RowField
                                    value={data.gjendje}
                                    readOnly={!canEditGjendje}
                                    onChange={(v) => setCurrentTurn((prev) => ({
                                      ...prev,
                                      products: { ...prev.products, [p.name]: { ...(prev.products[p.name] || emptyProduct()), gjendje: v } },
                                    }))}
                                  />
                                </td>
                                <td className="py-1 pl-1 text-right text-[10px] sm:text-xs text-slate-400 tabular-nums">
                                  {difStart || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {editable && !isConfirmed && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={confirmGjendje}
                        disabled={confirmingGjendje}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        {confirmingGjendje ? <Loader2 className="animate-spin mr-2" size={16}/> : <CheckCircle2 size={16} className="mr-2"/>}
                        Përfundova
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Coffee */}
                <Card className="bg-slate-900 border-slate-800 p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2 text-sm sm:text-base"><Coffee size={14}/> Kafet</h2>
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
                <Card className="bg-slate-900 border-slate-800 p-2 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm sm:text-base">Mulliri</h2>
                    {editable && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanFile(f); }}
                        />
                        <Button
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={scanning}
                          className="bg-amber-600 hover:bg-amber-500 h-8"
                        >
                          {scanning ? <Loader2 className="animate-spin mr-1" size={14}/> : <Camera size={14} className="mr-1"/>}
                          Skano Përfund
                        </Button>
                      </>
                    )}
                  </div>
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

                  {/* Kafe Kryesor — auto nga POS */}
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Coffee size={14}/> Kafe Kryesor (auto nga POS)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Shitje kafe</div>
                        <div className="h-9 flex items-center px-3 rounded border border-slate-800 bg-slate-950 tabular-nums font-semibold">
                          {coffeeSalesAuto}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">+ Fillim</div>
                        <div className="h-9 flex items-center px-3 rounded border border-slate-800 bg-slate-950 tabular-nums">
                          {t.turn_data.mulliriFillim || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">− Përfund</div>
                        <div className="h-9 flex items-center px-3 rounded border border-slate-800 bg-slate-950 tabular-nums">
                          {t.turn_data.mulliriPerfund || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Dif Kafe</div>
                        <div className={`h-9 flex items-center px-3 rounded border border-slate-800 bg-slate-950 font-bold tabular-nums ${difColor(kafeKryesorDif)}`}>
                          {kafeKryesorDif > 0 ? "+" : ""}{kafeKryesorDif.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Formula: Shitje kafe (POS: makiato, lece, etj.) + Mulliri Fillim − Mulliri Përfund
                    </p>
                  </div>
                </Card>

                {/* Xhiro + Shpenzime */}
                <Card className="bg-slate-900 border-slate-800 p-2 sm:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Xhiro (Lekë)</div>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={t.turn_data.xhiro}
                        readOnly={!editable}
                        onChange={(e) => setCurrentTurn((prev) => ({ ...prev, xhiro: Number(e.target.value) || 0 }))}
                        className="bg-slate-950 border-slate-700 text-white h-9 text-sm"
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
                              className="bg-slate-950 border-slate-700 text-white h-8 flex-1 text-sm px-2"
                            />
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={s.vlera}
                              readOnly={!editable}
                              onChange={(e) => updateShpenzim(i, "vlera", Number(e.target.value) || 0)}
                              className="bg-slate-950 border-slate-700 text-white h-8 w-20 sm:w-28 text-right text-sm px-2"
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
    <div className="text-[10px] sm:text-xs text-slate-400 mb-1">{label}</div>
    <Input
      type="number"
      inputMode="decimal"
      value={value}
      readOnly={readOnly}
      onChange={onChange ? (e) => onChange(Number(e.target.value) || 0) : undefined}
      className={`bg-slate-950 border-slate-700 text-white h-8 sm:h-9 text-right tabular-nums text-sm px-2 ${readOnly ? "opacity-70 cursor-not-allowed" : ""}`}
    />
  </div>
);

const RowField = ({ value, onChange, readOnly }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) => (
  <Input
    type="number"
    step="0.01"
    inputMode="decimal"
    value={value}
    readOnly={readOnly}
    onChange={onChange ? (e) => onChange(Number(e.target.value) || 0) : undefined}
    className={`bg-slate-950 border-slate-700 text-white h-7 text-right tabular-nums w-full min-w-[56px] text-xs sm:text-sm px-1.5 ${readOnly ? "opacity-70 cursor-not-allowed" : ""}`}
  />
);

export default RegjistrimiDitor;