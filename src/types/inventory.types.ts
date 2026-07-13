export interface InventoryProductData {
  stokFillim: number;
  furnizime: number;
  gjendje: number;
  shiriti: number;
}

export interface InventoryShpenzim {
  emertimi: string;
  vlera: number;
}

export interface InventoryTurnData {
  products: { [productName: string]: InventoryProductData };
  coffee: { [coffeeName: string]: number };
  xhiro: number;
  mulliriFillim: number;
  mulliriPerfund: number;
  shpenzime: InventoryShpenzim[];
  /** ISO timestamp when staff clicked "Konfirmo Gjendjen" — after this,
   * furnizime & gjendje are locked and stok fillim / dif become visible. */
  gjendjeConfirmedAt?: string | null;
  /** ISO timestamp when staff clicked "Fut Gjendjen" — after this,
   * the Gjendje column becomes visible and editable. Before this it's hidden. */
  gjendjeInputAt?: string | null;
}

export interface InventoryDailyEntry {
  date: string;
  turn1: InventoryTurnData;
  turn2: InventoryTurnData;
}

export const emptyProduct = (stokFillim = 0): InventoryProductData => ({
  stokFillim,
  furnizime: 0,
  gjendje: 0,
  shiriti: 0,
});

export const emptyTurn = (): InventoryTurnData => ({
  products: {},
  coffee: {},
  xhiro: 0,
  mulliriFillim: 0,
  mulliriPerfund: 0,
  shpenzime: [],
  gjendjeConfirmedAt: null,
  gjendjeInputAt: null,
});