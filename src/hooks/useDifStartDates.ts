import { useEffect, useState } from "react";
import { inventorySupabase as supabase } from "@/integrations/supabase/inventory-client";
import { InventoryCalculationService as Calc } from "@/services/inventoryCalculations";
import { InventoryProductData, InventoryTurnData, emptyProduct } from "@/types/inventory.types";

/**
 * Për çdo produkt, gjej datën e parë (brenda 30 ditëve të fundit deri te `upToDate`)
 * ku Dif ditor kumulativ ka nisur të mos jetë 0.
 */
export function useDifStartDates(productNames: string[], upToDate: string) {
  const [map, setMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!productNames.length) { setMap({}); return; }
    let cancelled = false;
    (async () => {
      // 30-day window
      const from = new Date(upToDate + "T00:00:00Z");
      from.setUTCDate(from.getUTCDate() - 30);
      const fromIso = from.toISOString().slice(0, 10);

      const { data } = await (supabase as any)
        .from("shift_turns")
        .select("entry_date, turn_data")
        .gte("entry_date", fromIso)
        .lte("entry_date", upToDate)
        .order("entry_date");
      if (cancelled) return;

      // group by date -> per-product total Dif
      const byDate: Record<string, Record<string, number>> = {};
      (data || []).forEach((r: any) => {
        const td: InventoryTurnData = r.turn_data || {};
        const products = td.products || {};
        byDate[r.entry_date] ||= {};
        Object.entries(products).forEach(([name, p]) => {
          const dif = Calc.calculateDif((p as InventoryProductData) || emptyProduct());
          byDate[r.entry_date][name] = (byDate[r.entry_date][name] || 0) + dif;
        });
      });

      const dates = Object.keys(byDate).sort();
      const out: Record<string, string | null> = {};
      productNames.forEach((name) => {
        // walk backwards; find most recent date with Dif = 0, then start = first date after with Dif != 0
        let lastZeroIdx = -1;
        for (let i = dates.length - 1; i >= 0; i--) {
          const v = byDate[dates[i]][name] ?? 0;
          if (Math.abs(v) < 0.0001) { lastZeroIdx = i; break; }
        }
        const startIdx = lastZeroIdx + 1;
        // Find first date after lastZero where dif is non-zero
        let startDate: string | null = null;
        for (let i = startIdx; i < dates.length; i++) {
          const v = byDate[dates[i]][name] ?? 0;
          if (Math.abs(v) > 0.0001) { startDate = dates[i]; break; }
        }
        out[name] = startDate;
      });
      if (!cancelled) setMap(out);
    })();
    return () => { cancelled = true; };
  }, [productNames.join("|"), upToDate]);

  return map;
}