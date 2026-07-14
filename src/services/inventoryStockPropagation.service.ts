import { InventoryTurnData, InventoryProductData, emptyProduct } from "@/types/inventory.types";
import { InventoryCalculationService as Calc } from "./inventoryCalculations";
import { ShiftTurnApi } from "@/lib/inventory-api";
import { staffRead } from "@/lib/staff-read";

export class InventoryStockPropagationService {
  static syncT1ToT2(t1: InventoryTurnData, existingT2: InventoryTurnData): InventoryTurnData {
    const products: { [k: string]: InventoryProductData } = {};
    Object.entries(t1.products).forEach(([name, p]) => {
      const nextStokFillim = Calc.calculateStockForNextTurn(p);
      const existing = existingT2.products[name] || emptyProduct();
      products[name] = { ...existing, stokFillim: nextStokFillim };
    });
    return {
      ...existingT2,
      products,
      mulliriFillim: t1.mulliriPerfund,
    };
  }

  static computeNextDayStock(t2: InventoryTurnData, t1: InventoryTurnData) {
    const stock: { [k: string]: number } = {};
    Object.entries(t2.products).forEach(([name, p]) => {
      stock[name] = Calc.calculateStockForNextTurn(p);
    });
    const mulliriFillim = t2.mulliriPerfund > 0 ? t2.mulliriPerfund : t1.mulliriPerfund;
    return { stock, mulliriFillim };
  }

  static computeNextDayStockFromGjendje(t2: InventoryTurnData, t1: InventoryTurnData) {
    const stock: { [k: string]: number } = {};
    const allNames = new Set([...Object.keys(t1.products), ...Object.keys(t2.products)]);
    allNames.forEach((name) => {
      const p2 = t2.products[name];
      const p1 = t1.products[name];
      if (p2 && p2.gjendje > 0) stock[name] = p2.gjendje;
      else if (p1 && p1.gjendje > 0) stock[name] = p1.gjendje;
      else if (p2) stock[name] = Calc.calculateStockForNextTurn(p2);
    });
    const mulliriFillim = t2.mulliriPerfund > 0 ? t2.mulliriPerfund : t1.mulliriPerfund;
    return { stock, mulliriFillim };
  }

  static async persistNextDayStock(dateStr: string, stock: { [k: string]: number }, mulliriFillim: number) {
    await ShiftTurnApi.persistNextDayStock({
      stock_date: dateStr,
      stock_data: stock,
      mulliri_fillim: mulliriFillim,
    });
  }

  static async loadNextDayStockFor(dateStr: string): Promise<{ stock: { [k: string]: number }; mulliriFillim: number } | null> {
    const { data, error } = await staffRead<{ stock_data: any; mulliri_fillim: number } | null>(
      "inv_next_day_stock.by_date",
      { stockDate: dateStr },
    );
    if (error || !data) return null;
    return { stock: (data.stock_data || {}) as { [k: string]: number }, mulliriFillim: Number(data.mulliri_fillim) || 0 };
  }
}