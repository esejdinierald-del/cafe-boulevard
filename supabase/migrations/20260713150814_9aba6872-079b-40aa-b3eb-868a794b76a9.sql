
-- Phase 1B: Lock down inventory tables. Reads stay public (anon+authenticated);
-- writes are now blocked at RLS and go only through service_role edge functions
-- (manage-shift-turn, manage-inv-product, pos-get-inventory).

-- shift_turns: drop allow_all, add public SELECT
DROP POLICY IF EXISTS shift_turns_all_anon ON public.shift_turns;
DROP POLICY IF EXISTS shift_turns_all_auth ON public.shift_turns;
CREATE POLICY "Public read shift_turns" ON public.shift_turns FOR SELECT TO anon, authenticated USING (true);

-- inv_daily_entries: drop allow_all, add public SELECT
DROP POLICY IF EXISTS inv_daily_entries_all ON public.inv_daily_entries;
CREATE POLICY "Public read inv_daily_entries" ON public.inv_daily_entries FOR SELECT TO anon, authenticated USING (true);

-- inv_products: drop allow_all, add public SELECT
DROP POLICY IF EXISTS inv_products_all ON public.inv_products;
CREATE POLICY "Public read inv_products" ON public.inv_products FOR SELECT TO anon, authenticated USING (true);

-- inv_next_day_stock: drop allow_all, add public SELECT
DROP POLICY IF EXISTS inv_next_day_stock_all ON public.inv_next_day_stock;
CREATE POLICY "Public read inv_next_day_stock" ON public.inv_next_day_stock FOR SELECT TO anon, authenticated USING (true);

-- orders (legacy): block new inserts from public — pos_orders is the canonical table now.
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Helpful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shift_turns_date_seq ON public.shift_turns (entry_date, sequence_number);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status_created ON public.pos_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log (created_at DESC);
