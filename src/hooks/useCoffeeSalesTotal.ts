import { useEffect, useState } from "react";
import { staffRead } from "@/lib/staff-read";

/**
 * Sum of coffee menu-item sales (makiato, lece, americano, etc.) within an interval.
 * A "coffee menu item" = any menu_item that has a recipe row linked to a raw_material
 * whose name contains "kaf" (case-insensitive), e.g. "Kafe e zezë".
 *
 * recipes.quantity_needed is the exact number of units (cope/doza) consumed per item sold.
 * Total = sum of (sold_qty * quantity_needed) for each coffee-linked menu item.
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
        // 1+2) find coffee materials + their recipes via edge function
        const { data: matRec } = await staffRead<{
          materials: Array<{ id: string; name: string }>;
          recipes: Array<{ menu_item_id: string; quantity_needed: number; material_id: string }>;
        }>("recipes.by_material_pattern", { pattern: "%kaf%" });
        const recs = matRec?.recipes ?? [];
        if (!matRec?.materials?.length) { if (!cancelled) setTotal(0); return; }
        const dosePerItem: Record<string, number> = {};
        (recs || []).forEach((r: any) => {
          // quantity_needed is already the number of units (cope/doza) per serving.
          const qty = Number(r.quantity_needed) || 0;
          const doses = qty > 0 ? qty : 1;
          dosePerItem[r.menu_item_id] = Math.max(dosePerItem[r.menu_item_id] || 0, doses);
        });
        const itemIds = Object.keys(dosePerItem);
        if (!itemIds.length) { if (!cancelled) setTotal(0); return; }

        // 3) sum sold qty in interval
        const { data: txns } = await staffRead<any[]>("transactions.range", {
          fromISO, toISO, type: "sale",
        });
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