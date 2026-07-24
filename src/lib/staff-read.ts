// Client-side wrapper around the `staff-read` edge function.
// All staff-only tables (pos_orders, raw_materials, inv_products, shift_turns,
// transactions, order_items_split, recipes) are now readable only via this
// endpoint, which validates x-shift-token server-side.
import { supabase } from "@/integrations/supabase/client";

export interface StaffReadResult<T = unknown> { data: T; error: string | null; }

export async function staffRead<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<StaffReadResult<T>> {
  const shiftToken = typeof window !== "undefined"
    ? localStorage.getItem("staff_shift_token") || undefined
    : undefined;
  if (!shiftToken) return { data: null as unknown as T, error: "Nuk ka turn aktiv" };
  const { data, error } = await supabase.functions.invoke("staff-read", {
    body: { action, shiftToken, ...params },
    headers: { "x-shift-token": shiftToken },
  });
  const errMsg = (data as any)?.error || error?.message || null;
  // Auto-recover from expired/invalid shift tokens: purge local token so the
  // QR curtain re-appears and the operator can re-authenticate by scanning.
  if (errMsg && /skadu|pavlefsh|Turn/i.test(errMsg)) {
    try {
      const stored = localStorage.getItem("staff_shift_token");
      if (stored) {
        localStorage.removeItem("staff_shift_token");
        // Reload once so useShiftCurtain re-runs and prompts for QR.
        if (!sessionStorage.getItem("shift_token_reload_guard")) {
          sessionStorage.setItem("shift_token_reload_guard", "1");
          setTimeout(() => window.location.reload(), 100);
        }
      }
    } catch { /* ignore */ }
  }
  return { data: ((data as any)?.data ?? null) as T, error: errMsg };
}

// Convenience for admin-read (passcode-guarded).
export async function adminRead<T = unknown>(
  action: string,
  adminPassword: string,
  params: Record<string, unknown> = {},
): Promise<StaffReadResult<T>> {
  const { data, error } = await supabase.functions.invoke("admin-read", {
    body: { action, adminPassword, ...params },
    headers: { "x-admin-passcode": adminPassword },
  });
  const errMsg = (data as any)?.error || error?.message || null;
  return { data: ((data as any)?.data ?? null) as T, error: errMsg };
}