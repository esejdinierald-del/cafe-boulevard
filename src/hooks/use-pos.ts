import { supabase } from "@/integrations/supabase/client";
import { usePOSStore, type POSCartItem } from "@/stores/pos-store";

export function usePOS() {
  const currentOrder = usePOSStore((s) => s.currentOrder);
  const setCurrentOrder = usePOSStore((s) => s.setCurrentOrder);
  const updateItems = usePOSStore((s) => s.updateItems);

  function addItem(productId: string, delta: number, notes: string, product: any) {
    if (!currentOrder) {
      // Auto-start bar mode if no order yet
      usePOSStore.getState().startOrder("bar", null);
    }
    const order = usePOSStore.getState().currentOrder!;
    const existing = order.items.find((i) => i.productId === productId);
    let next: POSCartItem[];
    if (existing) {
      const newQty = existing.quantity + delta;
      next = newQty <= 0
        ? order.items.filter((i) => i.productId !== productId)
        : order.items.map((i) => i.productId === productId ? { ...i, quantity: newQty, notes: notes || i.notes } : i);
    } else if (delta > 0) {
      next = [...order.items, {
        productId,
        name: product?.name ?? "",
        price: Number(product?.price ?? 0),
        quantity: delta,
        notes: notes || "",
      }];
    } else {
      next = order.items;
    }
    updateItems(next);
  }

  function removeItem(productId: string) {
    if (!currentOrder) return;
    updateItems(currentOrder.items.filter((i) => i.productId !== productId));
  }

  function updateItemNotes(productId: string, notes: string) {
    if (!currentOrder) return;
    updateItems(currentOrder.items.map((i) => i.productId === productId ? { ...i, notes } : i));
  }

  async function submitOrder(_authToken: string) {
    if (!currentOrder || currentOrder.items.length === 0) throw new Error("Shporta është bosh");
    const waiterName = (typeof window !== "undefined" ? localStorage.getItem("staff_name") : null) || null;
    const shiftToken =
      typeof window !== "undefined" ? localStorage.getItem("staff_shift_token") : null;
    const { data, error } = await supabase.functions.invoke("pos-create-order", {
      body: {
        tableNumber: currentOrder.tableNumber,
        mode: currentOrder.mode,
        operatorName: waiterName,
        shiftToken: shiftToken ?? undefined,
        items: currentOrder.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      },
      headers: shiftToken ? { "x-shift-token": shiftToken } : undefined,
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    setCurrentOrder(null);
    return data;
  }

  return { currentOrder, addItem, removeItem, updateItemNotes, submitOrder };
}