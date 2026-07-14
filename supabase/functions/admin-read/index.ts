// Admin-passcode-guarded reader used by AdminTools and health-check.
// Every request re-verifies the admin passcode server-side + rate-limits.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha256 } from "../_shared/hash.ts";
import { checkRateLimit, clientKey, maybeCleanup } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-passcode",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifyPasscode(supabase: any, provided: string): Promise<boolean> {
  const { data: setting } = await supabase
    .from("app_settings").select("value").eq("key", "admin_passcode").maybeSingle();
  const expectedHash = setting?.value;
  if (!expectedHash) return false;
  const providedHash = await sha256(String(provided));
  return providedHash === expectedHash;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  maybeCleanup();
  const rl = checkRateLimit({
    key: clientKey(req, "admin-read"),
    max: 30,
    windowMs: 5 * 60_000,
    blockMs: 10 * 60_000,
  });
  if (!rl.ok) return json({ error: "Shumë tentativa. Provo më vonë.", retryAfterSec: rl.retryAfterSec }, 429);

  try {
    const body = await req.json().catch(() => ({}));
    const passcode = req.headers.get("x-admin-passcode") || String(body.adminPassword || "");
    if (!passcode) return json({ error: "Mungon fjalëkalimi" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const ok = await verifyPasscode(supabase, passcode);
    if (!ok) return json({ error: "Fjalëkalim i pasaktë" }, 403);

    const action = String(body.action || "");
    switch (action) {
      case "app_logs.list": {
        const severity = body.severity && body.severity !== "all" ? String(body.severity) : null;
        const limit = Math.min(Number(body.limit) || 200, 500);
        let q = supabase.from("app_logs").select("*")
          .order("created_at", { ascending: false }).limit(limit);
        if (severity) q = q.eq("severity", severity);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "fiscal_receipts.range": {
        const start = String(body.start || "");
        const end = String(body.end || "");
        if (!start || !end) return json({ error: "start/end i mungon" }, 400);
        const { data, error } = await supabase
          .from("fiscal_receipts")
          .select("id, fiscal_number, issued_at, total_amount, net_amount, vat_amount, source, operator_name, table_number")
          .gte("issued_at", start).lt("issued_at", end)
          .order("issued_at", { ascending: true }).limit(1000);
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      }
      case "health_check": {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const results: Record<string, unknown> = {};
        const tables = ["menu_items", "pos_orders", "transactions", "raw_materials", "fiscal_receipts", "app_logs"];
        results.tables = {};
        for (const t of tables) {
          const { error } = await supabase.from(t as any).select("id", { count: "exact", head: true }).limit(1);
          (results.tables as any)[t] = error ? error.message : "ok";
        }
        const [{ data: fr }, { data: tx }] = await Promise.all([
          supabase.from("fiscal_receipts").select("total_amount").gte("issued_at", since),
          supabase.from("transactions").select("amount, type").gte("created_at", since).eq("type", "sale"),
        ]);
        results.fiscal_sum = (fr || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
        results.tx_sum = (tx || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const { data: negPrice } = await supabase.from("menu_items").select("id").lt("price", 0);
        const { data: negStock } = await supabase.from("raw_materials").select("id").lt("quantity", 0);
        results.negative_prices = negPrice?.length ?? 0;
        results.negative_stock = negStock?.length ?? 0;
        return json({ data: results });
      }
      case "backup.snapshot": {
        const READ_TABLES = [
          "categories", "menu_items", "tables", "staff_members",
          "raw_materials", "recipes", "inv_products", "app_settings", "ai_knowledge",
        ];
        const snapshot: Record<string, unknown> = {};
        for (const t of READ_TABLES) {
          const { data, error } = await supabase.from(t as any).select("*");
          snapshot[t] = error ? { error: error.message } : data;
        }
        return json({ data: snapshot });
      }
      default:
        return json({ error: `Veprim i panjohur: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});