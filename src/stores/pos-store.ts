import { create } from "zustand";

export type POSMode = "table" | "bar" | "delivery" | "takeaway";

export interface POSCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export interface POSOrderDraft {
  tableNumber: number | null;
  mode: POSMode;
  items: POSCartItem[];
}

interface POSState {
  currentOrder: POSOrderDraft | null;
  setCurrentOrder: (o: POSOrderDraft | null) => void;
  startOrder: (mode: POSMode, tableNumber?: number | null) => void;
  updateItems: (items: POSCartItem[]) => void;
}

export const usePOSStore = create<POSState>((set) => ({
  currentOrder: null,
  setCurrentOrder: (o) => set({ currentOrder: o }),
  startOrder: (mode, tableNumber = null) =>
    set({ currentOrder: { mode, tableNumber, items: [] } }),
  updateItems: (items) =>
    set((s) => (s.currentOrder ? { currentOrder: { ...s.currentOrder, items } } : s)),
}));