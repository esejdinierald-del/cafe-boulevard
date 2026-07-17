import { useState, useEffect } from "react";
import { usePOS } from "@/hooks/use-pos";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  display_order: number | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category_id: string | null;
  is_active?: boolean | null;
  offer_price?: number | null;
  offer_start_time?: string | null;
  offer_end_time?: string | null;
}

export const MenuGrid = () => {
  const { addItem } = usePOS();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("menu_items").select("*").eq("available", true),
        supabase.from("categories").select("*").eq("enabled", true).order("display_order"),
      ]);
      const enabledCats = (c as Category[]) || [];
      const enabledIds = new Set(enabledCats.map((cc) => cc.id));
      // Drop products whose category has been disabled by the admin.
      const enabledProducts = ((p as Product[]) || []).filter(
        (pp) => !pp.category_id || enabledIds.has(pp.category_id),
      );
      setProducts(enabledProducts);
      setCategories(enabledCats);
    };
    load();
    const poll = setInterval(load, 15000);
    return () => clearInterval(poll);
  }, []);

  const main = categories.filter((c) => !c.parent_id);
  const subs = selected ? categories.filter((c) => c.parent_id === selected) : [];

  // Search overrides navigation and searches across all products
  const isSearching = search.trim().length > 0;

  // Which category id to show products from
  const activeCatId = selectedSub || selected;

  const productsForCategory = activeCatId
    ? products.filter((p) => {
        if (p.category_id === activeCatId) return true;
        // If a main category is picked and it has no children selected,
        // include products from all its sub-categories too.
        if (selected && !selectedSub) {
          return subs.some((s) => s.id === p.category_id);
        }
        return false;
      })
    : [];

  const searchResults = isSearching
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const productCountByCat = (catId: string) => {
    const childIds = categories.filter((c) => c.parent_id === catId).map((c) => c.id);
    return products.filter((p) => p.category_id === catId || childIds.includes(p.category_id ?? "")).length;
  };

  const isOfferActive = (p: Product): boolean => {
    if (!p.offer_price || !p.offer_start_time || !p.offer_end_time) return false;
    const nowRome = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false });
    const start = p.offer_start_time.slice(0, 5);
    const end = p.offer_end_time.slice(0, 5);
    if (start > end) return nowRome >= start || nowRome <= end;
    return nowRome >= start && nowRome <= end;
  };
  const activePrice = (p: Product) => (isOfferActive(p) ? Number(p.offer_price) : Number(p.price));
  const addProduct = (p: Product) => addItem(p.id, 1, "", { ...p, price: activePrice(p) });

  const back = () => {
    if (selectedSub) setSelectedSub(null);
    else if (selected) setSelected(null);
  };

  const crumb = () => {
    const parts: string[] = [];
    if (selected) parts.push(main.find((c) => c.id === selected)?.name ?? "");
    if (selectedSub) parts.push(subs.find((c) => c.id === selectedSub)?.name ?? "");
    return parts.filter(Boolean).join(" › ");
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        {(selected || selectedSub) && !isSearching && (
          <button type="button"
            onClick={back}
            className="flex items-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
          >
            <ChevronLeft size={16} /> Kthehu
          </button>
        )}
        <input
          type="text"
          placeholder="Kërko produkt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
        />
      </div>

      {!isSearching && (selected || selectedSub) && (
        <div className="text-slate-400 text-xs mb-3">{crumb()}</div>
      )}

      {/* Search overrides everything */}
      {isSearching ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {searchResults.map((p) => (
            <button type="button"
              key={p.id}
              onClick={() => addProduct(p)}
              className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition text-left"
            >
              <div className="text-white font-medium">{p.name}</div>
              {isOfferActive(p) ? (
                <div className="text-sm mt-1 flex items-center gap-2">
                  <span className="line-through text-slate-500">{p.price} L</span>
                  <span className="text-amber-400 font-bold">🔥 {p.offer_price} L</span>
                </div>
              ) : (
                <div className="text-amber-400 text-sm mt-1">{p.price} Lekë</div>
              )}
            </button>
          ))}
          {searchResults.length === 0 && (
            <div className="col-span-full text-slate-500 text-sm text-center py-6">
              Asnjë rezultat
            </div>
          )}
        </div>
      ) : !selected ? (
        /* Main categories */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {main.map((c) => (
            <button type="button"
              key={c.id}
              onClick={() => { setSelected(c.id); setSelectedSub(null); }}
              className="aspect-square p-4 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-amber-600 hover:to-orange-700 border border-slate-600 rounded-lg text-white font-semibold flex flex-col items-center justify-center gap-1 transition"
            >
              <span className="text-center">{c.name}</span>
              <span className="text-xs text-slate-400">{productCountByCat(c.id)} artikuj</span>
            </button>
          ))}
          {main.length === 0 && (
            <div className="col-span-full text-slate-500 text-sm text-center py-6">
              Nuk ka kategori
            </div>
          )}
        </div>
      ) : subs.length > 0 && !selectedSub ? (
        /* Sub-categories */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {subs.map((c) => (
            <button type="button"
              key={c.id}
              onClick={() => setSelectedSub(c.id)}
              className="aspect-square p-4 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-amber-600 hover:to-orange-700 border border-slate-600 rounded-lg text-white font-semibold flex flex-col items-center justify-center gap-1 transition"
            >
              <span className="text-center">{c.name}</span>
              <span className="text-xs text-slate-400">{productCountByCat(c.id)} artikuj</span>
            </button>
          ))}
        </div>
      ) : (
        /* Products for the selected (sub-)category */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {productsForCategory.map((p) => (
            <button type="button"
              key={p.id}
              onClick={() => addProduct(p)}
              className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition text-left"
            >
              <div className="text-white font-medium">{p.name}</div>
              {isOfferActive(p) ? (
                <div className="text-sm mt-1 flex items-center gap-2">
                  <span className="line-through text-slate-500">{p.price} L</span>
                  <span className="text-amber-400 font-bold">🔥 {p.offer_price} L</span>
                </div>
              ) : (
                <div className="text-amber-400 text-sm mt-1">{p.price} Lekë</div>
              )}
              {p.description && (
                <div className="text-slate-400 text-xs mt-1 line-clamp-2">{p.description}</div>
              )}
            </button>
          ))}
          {productsForCategory.length === 0 && (
            <div className="col-span-full text-slate-500 text-sm text-center py-6">
              Asnjë produkt në këtë kategori
            </div>
          )}
        </div>
      )}
    </div>
  );
};