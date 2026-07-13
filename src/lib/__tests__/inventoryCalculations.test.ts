import { describe, it, expect } from "vitest";
import { calculateDif, calculateCoffeeDif, isLowStock } from "../inventoryCalculations";

describe("inventoryCalculations", () => {
  it("calculates standard Dif", () => {
    expect(calculateDif(10, 5, 12)).toBe(3);
  });
  it("calculates coffee Dif", () => {
    expect(calculateCoffeeDif(50, 100, 130)).toBe(20);
  });
  it("flags low stock", () => {
    expect(isLowStock(5, 10)).toBe(true);
    expect(isLowStock(15, 10)).toBe(false);
    expect(isLowStock(5, 0)).toBe(false);
  });
});