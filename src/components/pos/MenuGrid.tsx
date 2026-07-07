import { useState, useEffect } from "react";
import { usePOS } from "@/hooks/use-pos";
import { supabase } from "@/integrations/supabase/client";

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
  is_active: boolean | null;
}

export const MenuGrid = () => {
  const { addItem } = usePOS();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("menu_items").select("*").eq("is_active", true).then(({ data }) => {
      setProducts((data as Product[]) || []);
    });
    supabase.from("categories").select("*").order("display_order").then(({ data }) => {
      setCategories((data as Category[]) || []);
    });
  }, []);

  const main = categories.filter((c) => !c.parent_id);
  const subs = selected ? categories.filter((c) => c.parent_id === selected) : [];
  const filtered = products.filter((p) => {
    const matchCat = selected
      ? p.category_id === selected || subs.some((s) => s.id === p.category_id)
      : true;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 bg-slate-800 rounded-lg">
      <input
        type="text"
        placeholder="Kërko produkt..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 mb-4"
      />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {main.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(selected === c.id ? null : c.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
              selected === c.id
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {subs.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {subs.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                selected === c.id ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => addItem(p.id, 1, "", p)}
            className="p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition text-left"
          >
            <div className="text-white font-medium">{p.name}</div>
            <div className="text-amber-400 text-sm mt-1">{p.price} Lekë</div>
            {p.description && (
              <div className="text-slate-400 text-xs mt-1 line-clamp-2">{p.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};