// Deterministic color per staff name. Same input → same color, always.
// Kept intentionally simple so the exact same logic can be duplicated
// server-side (see supabase/functions/pos-create-order/index.ts).
export const STAFF_COLOR_PALETTE = [
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
] as const;

export function colorForStaff(name: string | null | undefined): string {
  const s = (name || "").trim();
  if (!s) return STAFF_COLOR_PALETTE[0];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return STAFF_COLOR_PALETTE[sum % STAFF_COLOR_PALETTE.length];
}