/**
 * Standard daily-registration formula.
 * Dif = Shiriti + Gjendje − StokFillim
 */
export function calculateDif(shiriti: number, gjendje: number, stokFillim: number): number {
  return Number((shiriti + gjendje - stokFillim).toFixed(3));
}

/**
 * Coffee-specific formula (uses mulliri readings instead of Gjendje).
 * Dif = ShitjeKafe + MulliriFillim − MulliriPerfundim
 */
export function calculateCoffeeDif(
  shitjeKafe: number,
  mulliriFillim: number,
  mulliriPerfundim: number
): number {
  return Number((shitjeKafe + mulliriFillim - mulliriPerfundim).toFixed(3));
}

/** Low-stock detector (threshold > 0). */
export function isLowStock(quantity: number, minThreshold: number): boolean {
  return minThreshold > 0 && quantity <= minThreshold;
}