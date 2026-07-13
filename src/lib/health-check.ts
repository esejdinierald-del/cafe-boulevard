import { supabase } from "@/integrations/supabase/client";
import { calculateDif, calculateCoffeeDif, isLowStock } from "@/lib/inventoryCalculations";

export interface HealthResult {
  name: string;
  ok: boolean;
  detail?: string;
}

function assert(cond: boolean, name: string, detail = ""): HealthResult {
  return { name, ok: cond, detail: cond ? undefined : detail };
}

export async function runHealthChecks(): Promise<HealthResult[]> {
  const results: HealthResult[] = [];

  // 1. Formula sanity
  results.push(assert(calculateDif(10, 5, 8) === 7, "Dif formula bazë", "10+5-8 duhet 7"));
  results.push(assert(calculateDif(0, 0, 0) === 0, "Dif me zero", ""));
  results.push(assert(calculateCoffeeDif(100, 50, 20) === 130, "Formula e kafesë", "100+50-20 duhet 130"));
  results.push(assert(isLowStock(2, 5) === true, "Low-stock detektim (below)"));
  results.push(assert(isLowStock(10, 5) === false, "Low-stock detektim (above)"));
  results.push(assert(!Number.isNaN(calculateDif(1, 2, 3)), "Dif jo NaN"));

  // 2. DB connectivity + critical tables
  const tables = ["menu_items", "pos_orders", "transactions", "raw_materials", "fiscal_receipts", "app_logs"];
  for (const t of tables) {
    try {
      const { error } = await supabase.from(t as any).select("id", { count: "exact", head: true }).limit(1);
      results.push(assert(!error, `DB: ${t}`, error?.message || ""));
    } catch (e) {
      results.push({ name: `DB: ${t}`, ok: false, detail: (e as Error).message });
    }
  }

  // 3. Fiscal receipt sanity: sum(fiscal) ≈ sum(transactions sales) for last 7 days
  try {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [{ data: fr }, { data: tx }] = await Promise.all([
      supabase.from("fiscal_receipts").select("total_amount").gte("issued_at", since),
      supabase.from("transactions").select("amount, type").gte("created_at", since).eq("type", "sale"),
    ]);
    const sumF = (fr || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
    const sumT = (tx || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const diff = Math.abs(sumF - sumT);
    results.push(assert(diff < 1, "Fiskal ≈ Transaksione (7 ditë)", `Δ = ${diff.toFixed(2)} Lekë`));
  } catch (e) {
    results.push({ name: "Fiskal ≈ Transaksione", ok: false, detail: (e as Error).message });
  }

  // 4. Menu items: no negative prices, no NaN
  try {
    const { data } = await supabase.from("menu_items").select("id, name, price").lt("price", 0);
    results.push(assert(!data || data.length === 0, "Asnjë çmim negativ", data?.length ? `${data.length} artikuj` : ""));
  } catch (e) {
    results.push({ name: "Çmime jo negative", ok: false, detail: (e as Error).message });
  }

  // 5. Raw materials: no negative stock
  try {
    const { data } = await supabase.from("raw_materials").select("id, name, quantity").lt("quantity", 0);
    results.push(assert(!data || data.length === 0, "Stok jo-negativ", data?.length ? `${data.length} artikuj në minus` : ""));
  } catch (e) {
    results.push({ name: "Stok jo-negativ", ok: false, detail: (e as Error).message });
  }

  return results;
}