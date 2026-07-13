import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Search, ChefHat, Loader2, ChevronDown, ChevronRight, Save } from "lucide-react";

interface MenuItem { id: string; name: string; category_id: string | null; }
interface Category { id: string; name: string; }
interface RawMaterial { id: string; name: string; unit: string; quantity: number; }
interface Recipe { id: string; menu_item_id: string; material_id: string; quantity_needed: number; }

interface DraftRow { material_id: string; quantity_needed: number; existingId?: string; }

export const RecipeManagerCard = () => {
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [mi, cat, rm, rc] = await Promise.all([
      supabase.from("menu_items").select("id, name, category_id").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("raw_materials").select("id, name, unit, quantity").order("name"),
      supabase.from("recipes").select("id, menu_item_id, material_id, quantity_needed"),
    ]);
    if (mi.error || cat.error || rm.error || rc.error) {
      toast.error("Ngarkimi dështoi");
    } else {
      setMenuItems((mi.data || []) as MenuItem[]);
      setCategories((cat.data || []) as Category[]);
      setMaterials((rm.data || []) as RawMaterial[]);
      setRecipes((rc.data || []) as Recipe[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter((m) => {
      if (categoryFilter !== "all" && m.category_id !== categoryFilter) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, query, categoryFilter]);

  const recipesFor = (menuItemId: string) =>
    recipes.filter((r) => r.menu_item_id === menuItemId);

  return (
    <Card className="glass-premium p-6 rounded-3xl shadow-[var(--shadow-elegant)]">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h2 className="text-xl font-display font-bold gradient-text-gold flex items-center gap-2">
          <ChefHat size={22}/> Recetat (Menu → Inventari)
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kërko artikull…"
              className="pl-8 h-9 w-56"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="all">Të gjitha kategoritë</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Kur një artikull menuje shitet dhe porosia bëhet "Gati", sasitë e receta zbriten automatikisht nga inventari kryesor.
        Njësitë janë ato të produktit (ml, g, kg, L, cope).
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={16}/> Duke ngarkuar…
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((mi) => {
            const rows = recipesFor(mi.id);
            const open = openId === mi.id;
            return (
              <div key={mi.id} className="border border-border rounded-lg bg-background/40 overflow-hidden">
                <button type="button"
                  onClick={() => setOpenId(open ? null : mi.id)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    <span className="font-medium">{mi.name}</span>
                    {rows.length > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {rows.length} përbërës
                      </span>
                    )}
                  </div>
                  {rows.length === 0 && (
                    <span className="text-xs text-muted-foreground">pa recetë</span>
                  )}
                </button>
                {open && (
                  <RecipeEditor
                    menuItemId={mi.id}
                    materials={materials}
                    initial={rows}
                    onSaved={load}
                  />
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Asnjë rezultat.</p>
          )}
        </div>
      )}
    </Card>
  );
};

const RecipeEditor = ({
  menuItemId, materials, initial, onSaved,
}: {
  menuItemId: string;
  materials: RawMaterial[];
  initial: Recipe[];
  onSaved: () => void;
}) => {
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initial.map((r) => ({ material_id: r.material_id, quantity_needed: Number(r.quantity_needed), existingId: r.id }))
  );
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((p) => [...p, { material_id: "", quantity_needed: 1 }]);
  const updateRow = (i: number, patch: Partial<DraftRow>) =>
    setRows((p) => p.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      // Delete removed
      const keepIds = new Set(rows.map((r) => r.existingId).filter(Boolean) as string[]);
      const toDelete = initial.filter((r) => !keepIds.has(r.id)).map((r) => r.id);
      if (toDelete.length) {
        const { error } = await supabase.from("recipes").delete().in("id", toDelete);
        if (error) throw error;
      }
      // Upsert rows with valid material
      const valid = rows.filter((r) => r.material_id && r.quantity_needed > 0);
      for (const r of valid) {
        if (r.existingId) {
          const { error } = await supabase.from("recipes")
            .update({ material_id: r.material_id, quantity_needed: r.quantity_needed })
            .eq("id", r.existingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("recipes")
            .insert({ menu_item_id: menuItemId, material_id: r.material_id, quantity_needed: r.quantity_needed });
          if (error) throw error;
        }
      }
      toast.success("Receta u ruajt");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Ruajtja dështoi");
    } finally {
      setSaving(false);
    }
  };

  const unitOf = (id: string) => materials.find((m) => m.id === id)?.unit || "";

  return (
    <div className="border-t border-border p-3 space-y-2 bg-muted/20">
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">Pa përbërës. Shto rreshtin e parë.</p>
      )}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 flex-wrap">
          <select
            value={r.material_id}
            onChange={(e) => updateRow(i, { material_id: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1 min-w-[180px]"
          >
            <option value="">— zgjidh produkt inventari —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
          <Input
            type="number"
            step="0.001"
            min="0"
            value={r.quantity_needed}
            onChange={(e) => updateRow(i, { quantity_needed: Number(e.target.value) || 0 })}
            className="h-9 w-28 text-right"
          />
          <span className="text-xs text-muted-foreground w-10">{unitOf(r.material_id)}</span>
          <Button size="sm" variant="ghost" onClick={() => removeRow(i)}
            className="text-rose-400 hover:text-rose-300 h-9 w-9 p-0">
            <Trash2 size={14}/>
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button size="sm" onClick={addRow} variant="secondary" className="h-8">
          <Plus size={14} className="mr-1"/> Shto përbërës
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 h-8">
          {saving ? <Loader2 className="animate-spin" size={14}/> : <><Save size={14} className="mr-1"/> Ruaj</>}
        </Button>
      </div>
    </div>
  );
};

export default RecipeManagerCard;