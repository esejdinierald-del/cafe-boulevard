import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sum of coffee menu-item sales (makiato, lece, americano, etc.) within an interval.
 * A "coffee menu item" = any menu_item that has a recipe row linked to a raw_material
 * whose name contains "kaf" (case-insensitive), e.g. "Kafe e zezë".
 *
 * Returns total number of coffee drinks sold. Each drink = 1 dose (default),
 * unless recipes.quantity_needed encodes multi-dose (doppio = 2). We derive doses
 * as: sold_qty_of_item * dosesPerServing, where dosesPerServing = round(quantity_needed / SINGLE_DOSE_G).
 */
export function useCoffeeSalesTotal(fromISO: string | null, toISO: string | null, refreshKey = 0) {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fromISO || !toISO) { setTotal(0); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 1) find coffee raw_materials
        const { data: mats } = await supabase
          .from("raw_materials")
          .select("id, name")
          .ilike("name", "%kaf%");
        const matIds = (mats || []).map((m: any) => m.id);
        if (!matIds.length) { if (!cancelled) setTotal(0); return; }

        // 2) recipes linking menu_items to these materials
        const { data: recs } = await supabase
          .from("recipes")
          .select("menu_item_id, quantity_needed, material_id")
          .in("material_id", matIds);
        const dosePerItem: Record<string, number> = {};
        (recs || []).forEach((r: any) => {
          // Assume 0.007 kg = 1 dose; fall back to 1 if quantity_needed missing.
          const qty = Number(r.quantity_needed) || 0;
          const doses = qty > 0 ? Math.max(1, Math.round(qty / 0.007)) : 1;
          dosePerItem[r.menu_item_id] = Math.max(dosePerItem[r.menu_item_id] || 0, doses);
        });
        const itemIds = Object.keys(dosePerItem);
        if (!itemIds.length) { if (!cancelled) setTotal(0); return; }

        // 3) sum sold qty in interval
        const { data: txns } = await supabase
          .from("transactions")
          .select("items, created_at, type")
          .eq("type", "sale")
          .gte("created_at", fromISO)
          .lt("created_at", toISO);
        let sum = 0;
        (txns || []).forEach((row: any) => {
          const items = Array.isArray(row.items) ? row.items : [];
          items.forEach((it: any) => {
            const id = it?.productId;
            if (id && dosePerItem[id]) {
              sum += (Number(it.quantity) || 0) * dosePerItem[id];
            }
          });
        });
        if (!cancelled) setTotal(sum);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fromISO, toISO, refreshKey]);

  return { total, loading };
}