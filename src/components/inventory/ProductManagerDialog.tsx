import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inventorySupabase } from "@/integrations/supabase/inventory-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Search, Loader2, Save } from "lucide-react";

export interface InvProductRow {
  id: string;
  name: string;
  sort_order: number;
  menu_item_ids: string[];
  units_per_sale: number;
}

interface MenuItemLite {
  id: string;
  name: string;
}

interface Props {
  trigger: React.ReactNode;
  products: InvProductRow[];
  onChanged: (opts?: { renamedFrom?: string; renamedTo?: string; deletedName?: string; added?: InvProductRow }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ProductManagerDialog = ({ trigger, products, onChanged, open: openProp, onOpenChange }: Props) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    if (openProp === undefined) setOpenState(v);
  };
  const [menuItems, setMenuItems] = useState<MenuItemLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIds, setNewIds] = useState<string[]>([]);
  const [newUnits, setNewUnits] = useState(1);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name")
        .order("name");
      if (error) toast.error(error.message);
      else setMenuItems((data || []) as MenuItemLite[]);
      setLoading(false);
    })();
  }, [open]);

  const addProduct = async () => {
    const name = newName.trim();
    if (!name) return;
    const nextOrder = (products[products.length - 1]?.sort_order ?? 0) + 10;
    const { data, error } = await (inventorySupabase as any)
      .from("inv_products")
      .insert({ name, sort_order: nextOrder, menu_item_ids: newIds, units_per_sale: newUnits })
      .select("id, name, sort_order, menu_item_ids, units_per_sale")
      .single();
    if (error) return toast.error(error.message);
    setNewName(""); setNewIds([]); setNewUnits(1);
    onChanged({ added: data as InvProductRow });
    toast.success("Produkti u shtua");
  };

  const removeProduct = async (p: InvProductRow) => {
    if (!confirm(`Fshij "${p.name}"?`)) return;
    const { error } = await (inventorySupabase as any).from("inv_products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    onChanged({ deletedName: p.name });
    toast.success("U fshi");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Menaxho produktet</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={16} /> Duke ngarkuar…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Existing products */}
            <div className="space-y-3">
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  menuItems={menuItems}
                  onRemove={() => removeProduct(p)}
                  onSaved={(renamedFrom, renamedTo) => onChanged({ renamedFrom, renamedTo })}
                />
              ))}
              {products.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">Asnjë produkt akoma.</p>
              )}
            </div>

            {/* Add new */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Plus size={16} /> Shto produkt të ri</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Emri i produktit"
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={newUnits}
                  onChange={(e) => setNewUnits(Number(e.target.value) || 0)}
                  placeholder="Njësi për shitje"
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Button onClick={addProduct} className="bg-emerald-600 hover:bg-emerald-500">
                  <Plus size={14} className="mr-1" /> Shto
                </Button>
              </div>
              <MenuMultiSelect
                menuItems={menuItems}
                selected={newIds}
                onChange={setNewIds}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* --------------- Row --------------- */
const ProductRow = ({
  product,
  menuItems,
  onRemove,
  onSaved,
}: {
  product: InvProductRow;
  menuItems: MenuItemLite[];
  onRemove: () => void;
  onSaved: (renamedFrom?: string, renamedTo?: string) => void;
}) => {
  const [name, setName] = useState(product.name);
  const [ids, setIds] = useState<string[]>(product.menu_item_ids || []);
  const [units, setUnits] = useState<number>(Number(product.units_per_sale) || 1);
  const [saving, setSaving] = useState(false);

  const dirty =
    name.trim() !== product.name ||
    units !== product.units_per_sale ||
    ids.join(",") !== (product.menu_item_ids || []).join(",");

  const save = async () => {
    const newName = name.trim();
    if (!newName) return toast.error("Emri s'mund të jetë bosh");
    setSaving(true);
    const { error } = await (inventorySupabase as any)
      .from("inv_products")
      .update({ name: newName, menu_item_ids: ids, units_per_sale: units })
      .eq("id", product.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    const renamed = newName !== product.name;
    onSaved(renamed ? product.name : undefined, renamed ? newName : undefined);
    toast.success("U ruajt");
  };

  return (
    <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto_auto] gap-2 items-center">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-slate-950 border-slate-700 text-white h-9"
          placeholder="Emri"
        />
        <Input
          type="number"
          step="0.01"
          value={units}
          onChange={(e) => setUnits(Number(e.target.value) || 0)}
          className="bg-slate-950 border-slate-700 text-white h-9"
          placeholder="Njësi/shitje"
        />
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty || saving}
          className="bg-emerald-600 hover:bg-emerald-500 h-9"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 h-9"
        >
          <Trash2 size={14} />
        </Button>
      </div>
      <MenuMultiSelect menuItems={menuItems} selected={ids} onChange={setIds} />
    </div>
  );
};

/* --------------- Multi-select --------------- */
const MenuMultiSelect = ({
  menuItems,
  selected,
  onChange,
}: {
  menuItems: MenuItemLite[];
  selected: string[];
  onChange: (v: string[]) => void;
}) => {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return menuItems;
    return menuItems.filter((m) => m.name.toLowerCase().includes(s));
  }, [q, menuItems]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="border border-slate-800 rounded p-2 bg-slate-950/60">
      <div className="flex items-center gap-2 mb-2">
        <Search size={14} className="text-slate-500" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kërko artikull menuje…"
          className="bg-slate-900 border-slate-700 text-white h-8 flex-1"
        />
        <span className="text-xs text-slate-500 whitespace-nowrap">{selected.length} zgjedhur</span>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filtered.map((m) => (
          <label
            key={m.id}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-800/60 cursor-pointer text-sm"
          >
            <Checkbox
              checked={selected.includes(m.id)}
              onCheckedChange={() => toggle(m.id)}
            />
            <span className="truncate">{m.name}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">Asnjë rezultat.</p>
        )}
      </div>
    </div>
  );
};

export default ProductManagerDialog;