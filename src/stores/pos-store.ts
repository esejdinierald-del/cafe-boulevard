import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

export const usePOSStore = create<POSState>()(
  persist(
    (set) => ({
      currentOrder: null,
      setCurrentOrder: (o) => set({ currentOrder: o }),
      startOrder: (mode, tableNumber = null) =>
        set({ currentOrder: { mode, tableNumber, items: [] } }),
      updateItems: (items) =>
        set((s) => (s.currentOrder ? { currentOrder: { ...s.currentOrder, items } } : s)),
    }),
    {
      name: "boulevard.pos-store.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ currentOrder: s.currentOrder }),
    }
  )
);