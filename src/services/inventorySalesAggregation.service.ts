import { staffRead } from "@/lib/staff-read";

export interface InvProductWithMapping {
  name: string;
  menu_item_ids: string[];
  units_per_sale: number;
}

interface SaleItem {
  productId?: string;
  quantity?: number;
}

/** Aggregates POS sales (transactions of type 'sale') per inventory product. */
export class InventorySalesAggregationService {
  /** Build a map menu_item_id -> total sold quantity in the interval. */
  static async fetchSoldQtyByMenuItem(fromISO: string, toISO: string): Promise<Record<string, number>> {
    const { data, error } = await staffRead<any[]>("transactions.range", {
      fromISO, toISO, type: "sale",
    });
    if (error) throw new Error(error);
    const map: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const items: SaleItem[] = Array.isArray(row.items) ? row.items : [];
      items.forEach((it) => {
        if (!it?.productId) return;
        map[it.productId] = (map[it.productId] || 0) + (Number(it.quantity) || 0);
      });
    });
    return map;
  }

  /** Returns productName -> shiriti (units), based on sold qty * units_per_sale. */
  static async aggregateSalesByProduct(
    fromISO: string,
    toISO: string,
    products: InvProductWithMapping[],
  ): Promise<Record<string, number>> {
    const soldMap = await this.fetchSoldQtyByMenuItem(fromISO, toISO);
    const out: Record<string, number> = {};
    products.forEach((p) => {
      const ids = p.menu_item_ids || [];
      const upe = Number(p.units_per_sale) || 1;
      let total = 0;
      ids.forEach((id) => {
        total += (soldMap[id] || 0) * upe;
      });
      out[p.name] = total;
    });
    return out;
  }

  /** Rome-local midnight for a given YYYY-MM-DD (returns ISO). */
  static romeStartOfDayISO(dateStr: string): string {
    const utcMidnight = new Date(`${dateStr}T00:00:00Z`);
    const rome = new Date(utcMidnight.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
    const offsetMs = rome.getTime() - utcMidnight.getTime();
    return new Date(utcMidnight.getTime() - offsetMs).toISOString();
  }
}