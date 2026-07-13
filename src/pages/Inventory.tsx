import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { inventorySupabase } from "@/integrations/supabase/inventory-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Package, Plus, AlertTriangle, ShoppingBag, Loader2, ArrowLeft } from "lucide-react";

interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  location_id: string | null;
}

const Inventory = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplyQtys, setSupplyQtys] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [hasToken, setHasToken] = useState<boolean>(
    typeof window !== "undefined" && !!localStorage.getItem("staff_shift_token"),
  );

  const staffRole = (typeof window !== "undefined"
    ? localStorage.getItem("staff_role")
    : null) || "waiter";
  const staffName = (typeof window !== "undefined"
    ? localStorage.getItem("staff_name")
    : null) || "Kamarier";
  const isKitchen = staffRole === "kitchen";

  useEffect(() => {
    setHasToken(!!localStorage.getItem("staff_shift_token"));
  }, []);

  const load = async () => {
    // Sync with /regjistrimi-ditor: list is driven by inv_products.
    // Missing raw_materials are created on the fly so supplies always land on a real row.
    const [{ data: rawData, error }, { data: invProds }] = await Promise.all([
      supabase
        .from("raw_materials")
        .select("id, name, quantity, unit, min_threshold, location_id")
        .order("name"),
      (inventorySupabase as any)
        .from("inv_products")
        .select("name, sort_order")
        .order("sort_order")
        .order("name"),
    ]);
    if (error) {
      toast.error("Nuk u ngarkua inventari");
    } else {
      const norm = (s: string) => (s || "").trim().toLowerCase();
      const rawByName = new Map<string, any>();
      (rawData ?? []).forEach((r: any) => rawByName.set(norm(r.name), r));

      const invList = invProds ?? [];
      // Auto-create any missing raw_materials so the list matches inv_products 1:1.
      const missing = invList.filter((p: any) => !rawByName.has(norm(p.name)));
      if (missing.length > 0) {
        const { data: inserted } = await supabase
          .from("raw_materials")
          .insert(missing.map((p: any) => ({ name: p.name, quantity: 0, unit: "cope", min_threshold: 0 })))
          .select("id, name, quantity, unit, min_threshold, location_id");
        (inserted ?? []).forEach((r: any) => rawByName.set(norm(r.name), r));
      }

      const list = invList
        .map((p: any) => {
          const r = rawByName.get(norm(p.name));
          if (!r) return null;
          return {
            ...r,
            quantity: Number(r.quantity),
            min_threshold: Number(r.min_threshold),
          };
        })
        .filter(Boolean) as Material[];
      setMaterials(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    load();
    const channel = supabase
      .channel("inventory-materials")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raw_materials" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inv_products" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasToken]);

  if (!hasToken) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4 text-center border border-slate-700 bg-slate-800 rounded-lg p-6">
          <Package className="mx-auto text-amber-400" size={36} />
          <h1 className="text-xl font-bold">Kërkohet turn aktiv</h1>
          <p className="text-sm text-slate-400">
            Për të hyrë te Inventari duhet të kesh një turn aktiv të stafit.
          </p>
          <Button
            onClick={() => navigate("/staff")}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold"
          >
            Hap Stafi
          </Button>
        </div>
      </div>
    );
  }

  const lowStockCount = useMemo(
    () => materials.filter((m) => m.quantity <= m.min_threshold).length,
    [materials],
  );

  const resetForm = () => {
    setSupplyQtys({});
    setNote("");
  };

  const submitSupplies = async () => {
    const rows = materials
      .map((m) => ({ material: m, qty: Number(supplyQtys[m.id] || 0) }))
      .filter((r) => r.qty > 0);
    if (rows.length === 0) {
      toast.error("Fut sasi për të paktën një artikull");
      return;
    }
    setSubmitting(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const r of rows) {
        const { data, error } = await supabase.functions.invoke("pos-get-inventory", {
          body: {
            action: "addSupply",
            materialId: r.material.id,
            quantity: r.qty,
            note: note || null,
            operatorName: staffName,
            locationId: "main",
          },
        });
        if (error || (data as any)?.error) fail++;
        else ok++;
      }
      if (ok > 0) toast.success(`Furnizimet u ruajtën (${ok}${fail ? `, ${fail} dështuan` : ""})`);
      if (fail > 0 && ok === 0) throw new Error("Të gjitha furnizimet dështuan");
      setDialogOpen(false);
      resetForm();
      // Direct to daily registration where stok fillim is already updated and shiriti runs live from POS.
      navigate("/regjistrimi-ditor");
    } catch (e: any) {
      toast.error(e.message || "Gabim gjatë furnizimit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
        <button
            onClick={() => navigate("/pos")}
            className="p-2 rounded hover:bg-slate-800"
            aria-label="Kthehu tek POS"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Package size={22} /> Inventari
          </h1>
        </div>
        {!isKitchen && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-green-600 hover:bg-green-500 text-white"
          >
            <Plus size={16} className="mr-1" /> Shto Furnizim
          </Button>
        )}
      </header>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-700 bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase">Total Materiale</div>
                <div className="text-2xl font-bold mt-1">{materials.length}</div>
              </div>
              <ShoppingBag className="text-slate-500" size={28} />
            </div>
          </div>
          <div className="border border-slate-700 bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase">Stock i Ulët</div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    lowStockCount > 0 ? "text-red-400" : "text-white"
                  }`}
                >
                  {lowStockCount}
                </div>
              </div>
              <AlertTriangle
                className={lowStockCount > 0 ? "text-red-400" : "text-slate-500"}
                size={28}
              />
            </div>
          </div>
          <div className="border border-slate-700 bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase">Sasi Totale</div>
                <div className="text-2xl font-bold mt-1">
                  {materials
                    .reduce((acc, m) => acc + (m.quantity || 0), 0)
                    .toFixed(2)}
                </div>
              </div>
              <Package className="text-slate-500" size={28} />
            </div>
          </div>
        </div>

        {isKitchen && (
          <div className="border border-amber-500/40 bg-amber-500/10 text-amber-200 rounded-lg p-3 text-sm">
            Ju mund të shikoni inventarin, por nuk mund të shtoni furnizime.
          </div>
        )}

        {/* Table */}
        <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="animate-spin mr-2" size={18} /> Duke ngarkuar...
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12 text-slate-500">Nuk ka materiale</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-300">Materiali</TableHead>
                  <TableHead className="text-slate-300 text-right">Sasia</TableHead>
                  <TableHead className="text-slate-300">Njësia</TableHead>
                  <TableHead className="text-slate-300 text-right">Min</TableHead>
                  <TableHead className="text-slate-300">Statusi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => {
                  const isLow = m.quantity <= m.min_threshold;
                  return (
                    <TableRow
                      key={m.id}
                      className={`border-slate-700 hover:bg-slate-700/40 ${
                        isLow ? "bg-red-500/10" : ""
                      }`}
                    >
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.quantity.toFixed(3)}
                      </TableCell>
                      <TableCell>{m.unit}</TableCell>
                      <TableCell className="text-right tabular-nums text-slate-400">
                        {m.min_threshold.toFixed(3)}
                      </TableCell>
                      <TableCell>
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-300">
                            <AlertTriangle size={12} /> Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-300">
                            OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Add Supply Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Shto Furnizim</DialogTitle>
            <DialogDescription className="text-slate-400">
              Fut sasinë e furnizuar për çdo artikull. Lëri bosh ato që nuk janë furnizuar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {materials.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Asnjë artikull inventari</p>
            ) : (
              materials.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1.5 border-b border-slate-700/50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-[11px] text-slate-500">
                      stok: {m.quantity.toFixed(2)} {m.unit}
                    </div>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.001"
                    value={supplyQtys[m.id] || ""}
                    onChange={(e) =>
                      setSupplyQtys((p) => ({ ...p, [m.id]: e.target.value }))
                    }
                    className="bg-slate-900 border-slate-700 text-white h-9 w-24 text-right"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400 w-10">{m.unit}</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-700">
            <label className="text-sm text-slate-300 mb-1 block">Shënim (opsional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="Furnitor, faturë, etj."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              Anulo
            </Button>
            <Button
              onClick={submitSupplies}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Plus size={16} className="mr-1" />
              )}
              Ruaj Furnizimet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;