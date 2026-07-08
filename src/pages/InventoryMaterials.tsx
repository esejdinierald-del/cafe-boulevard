import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

const InventoryMaterials = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const staffRole = (typeof window !== "undefined"
    ? localStorage.getItem("staff_role")
    : null) || "waiter";
  const staffName = (typeof window !== "undefined"
    ? localStorage.getItem("staff_name")
    : null) || "Kamarier";
  const isKitchen = staffRole === "kitchen";

  useEffect(() => {
    const token = localStorage.getItem("staff_shift_token");
    if (!token) {
      navigate("/staff", { replace: true });
    }
  }, [navigate]);

  const load = async () => {
    const { data, error } = await supabase
      .from("raw_materials")
      .select("id, name, quantity, unit, min_threshold, location_id")
      .order("name");
    if (error) {
      toast.error("Nuk u ngarkua inventari");
    } else {
      setMaterials(
        (data ?? []).map((m: any) => ({
          ...m,
          quantity: Number(m.quantity),
          min_threshold: Number(m.min_threshold),
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("inventory-materials")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raw_materials" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const lowStockCount = useMemo(
    () => materials.filter((m) => m.quantity <= m.min_threshold).length,
    [materials],
  );

  const resetForm = () => {
    setSelectedId("");
    setQuantity("");
    setNote("");
  };

  const submitSupply = async () => {
    const qty = Number(quantity);
    if (!selectedId) {
      toast.error("Zgjidh një material");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Sasia duhet të jetë pozitive");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("pos-get-inventory", {
        body: {
          action: "addSupply",
          materialId: selectedId,
          quantity: qty,
          note: note || null,
          operatorName: staffName,
          locationId: "main",
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Gabim gjatë furnizimit");
      }
      toast.success("Furnizimi u shtua me sukses");
      setDialogOpen(false);
      resetForm();
      load();
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
            <Package size={22} /> Materialet (POS)
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
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Shto Furnizim</DialogTitle>
            <DialogDescription className="text-slate-400">
              Zgjidh materialin dhe shto sasinë e re.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-300 mb-1 block">Materiali</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
              >
                <option value="">— zgjidh —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Sasia</label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
                placeholder="p.sh. 5.00"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1 block">Shënim (opsional)</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
                placeholder="Furnitor, faturë, etj."
              />
            </div>
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
              onClick={submitSupply}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Plus size={16} className="mr-1" />
              )}
              Ruaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryMaterials;