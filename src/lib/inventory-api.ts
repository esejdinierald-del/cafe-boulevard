import { supabase } from "@/integrations/supabase/client";

async function invoke<T = any>(name: string, body: Record<string, unknown>): Promise<T> {
  const shiftToken =
    typeof window !== "undefined" ? localStorage.getItem("staff_shift_token") : null;
  const { data, error } = await supabase.functions.invoke(name, {
    body: { ...body, shiftToken: shiftToken ?? undefined },
    headers: shiftToken ? { "x-shift-token": shiftToken } : undefined,
  });
  if (error) throw new Error(error.message || "Gabim rrjeti");
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

export const ShiftTurnApi = {
  insert: (p: { entry_date: string; staff_name: string; sequence_number: number; turn_data: unknown }) =>
    invoke<{ turn: any }>("manage-shift-turn", { action: "insert", ...p }),
  updateTurnData: (id: string, turn_data: unknown) =>
    invoke("manage-shift-turn", { action: "update_turn_data", id, turn_data }),
  updateStaffName: (id: string, staff_name: string) =>
    invoke("manage-shift-turn", { action: "update_staff_name", id, staff_name }),
  lock: (id: string, turn_data: unknown, locked_at?: string) =>
    invoke("manage-shift-turn", { action: "lock", id, turn_data, locked_at }),
  backupDaily: (p: { entry_date: string; turn1_data: unknown; turn2_data: unknown; turn1_closed_at: string | null }) =>
    invoke("manage-shift-turn", { action: "backup_daily", ...p }),
  persistNextDayStock: (p: { stock_date: string; stock_data: Record<string, number>; mulliri_fillim: number }) =>
    invoke("manage-shift-turn", { action: "persist_next_day_stock", ...p }),
};

export const InvProductApi = {
  insert: (p: { name: string; sort_order: number; menu_item_ids: string[]; units_per_sale: number; track_daily?: boolean }) =>
    invoke<{ product: any }>("manage-inv-product", { action: "insert", ...p }),
  update: (p: { id: string; name?: string; menu_item_ids?: string[]; units_per_sale?: number; sort_order?: number; track_daily?: boolean }) =>
    invoke("manage-inv-product", { action: "update", ...p }),
  swapOrder: (id_a: string, id_b: string) =>
    invoke("manage-inv-product", { action: "swap_order", id_a, id_b }),
  delete: (id: string) => invoke("manage-inv-product", { action: "delete", id }),
};