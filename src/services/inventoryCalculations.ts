import { InventoryProductData, InventoryTurnData } from "@/types/inventory.types";

export class InventoryCalculationService {
  /** Dif = Shiriti + Gjendje − StokFillim − Furnizime */
  static calculateDif(p: InventoryProductData): number {
    return (p.shiriti || 0) + (p.gjendje || 0) - (p.stokFillim || 0) - (p.furnizime || 0);
  }

  static calculateMulliriDif(fillim: number, perfund: number, totalKafe: number): number {
    return totalKafe - (perfund - fillim);
  }

  static calculateTotalCoffee(turn: InventoryTurnData): number {
    return Object.values(turn.coffee || {}).reduce((s, q) => s + (Number(q) || 0), 0);
  }

  static calculateTotalShpenzime(turn: InventoryTurnData): number {
    return (turn.shpenzime || []).reduce((s, x) => s + (Number(x.vlera) || 0), 0);
  }

  /** Teorik: stokFillim + furnizime − shiriti */
  static calculateStockForNextTurn(p: InventoryProductData): number {
    return (p.stokFillim || 0) + (p.furnizime || 0) - (p.shiriti || 0);
  }

  static calculateStockFromGjendje(p: InventoryProductData): number {
    return p.gjendje || 0;
  }

  static hasAnyDifferences(products: { [key: string]: InventoryProductData }): boolean {
    return Object.values(products).some((p) => this.calculateDif(p) !== 0);
  }
}