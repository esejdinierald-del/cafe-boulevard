// Separate Supabase project used ONLY for the "Regjistrimi Ditor" inventory module
// (tables: inv_products, inv_daily_entries, inv_next_day_stock).
// The main POS/menu/staff data still lives in the default client.
import { createClient } from "@supabase/supabase-js";

export const inventorySupabase = createClient(
  "https://lxorhmwiyplmdyyotrjc.supabase.co",
  "sb_publishable_bfVB6cWuwEOwpCE949-exA_H46wZ8M2",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: "inv-sb-auth",
    },
  },
);