
-- transactions
DROP POLICY IF EXISTS "Public read transactions" ON public.transactions;
CREATE POLICY "Staff can view transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.transactions FROM anon;

-- raw_materials
DROP POLICY IF EXISTS "Public read raw_materials" ON public.raw_materials;
CREATE POLICY "Staff can view raw_materials" ON public.raw_materials
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.raw_materials FROM anon;

-- recipes: drop permissive ALL policy and public SELECT
DROP POLICY IF EXISTS "Manage recipes" ON public.recipes;
DROP POLICY IF EXISTS "Public read recipes" ON public.recipes;
CREATE POLICY "Staff can view recipes" ON public.recipes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can manage recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.recipes FROM anon;

-- supplies
DROP POLICY IF EXISTS "Public read supplies" ON public.supplies;
CREATE POLICY "Staff can view supplies" ON public.supplies
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.supplies FROM anon;

-- order_items_split
DROP POLICY IF EXISTS "Public read order_items_split" ON public.order_items_split;
CREATE POLICY "Staff can view order_items_split" ON public.order_items_split
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.order_items_split FROM anon;

-- pos_orders
DROP POLICY IF EXISTS "Public read pos_orders" ON public.pos_orders;
CREATE POLICY "Staff can view pos_orders" ON public.pos_orders
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.pos_orders FROM anon;

-- print_jobs
DROP POLICY IF EXISTS "Public read print_jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Public insert print_jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Public update print_jobs" ON public.print_jobs;
CREATE POLICY "Staff can view print_jobs" ON public.print_jobs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert print_jobs" ON public.print_jobs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update print_jobs" ON public.print_jobs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
REVOKE SELECT, INSERT, UPDATE ON public.print_jobs FROM anon;

-- push_subscriptions: keep public INSERT (customer device registration), block anon SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Staff can view push subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can update push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff can delete push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (true);
REVOKE SELECT, UPDATE, DELETE ON public.push_subscriptions FROM anon;

-- inv_daily_entries
DROP POLICY IF EXISTS "Public read inv_daily_entries" ON public.inv_daily_entries;
CREATE POLICY "Staff can view inv_daily_entries" ON public.inv_daily_entries
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.inv_daily_entries FROM anon;

-- inv_next_day_stock
DROP POLICY IF EXISTS "Public read inv_next_day_stock" ON public.inv_next_day_stock;
CREATE POLICY "Staff can view inv_next_day_stock" ON public.inv_next_day_stock
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.inv_next_day_stock FROM anon;

-- inv_products
DROP POLICY IF EXISTS "Public read inv_products" ON public.inv_products;
CREATE POLICY "Staff can view inv_products" ON public.inv_products
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.inv_products FROM anon;

-- shift_turns
DROP POLICY IF EXISTS "Public read shift_turns" ON public.shift_turns;
CREATE POLICY "Staff can view shift_turns" ON public.shift_turns
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.shift_turns FROM anon;

-- Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_fiscal_receipt() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_manager_signup() FROM PUBLIC, anon, authenticated;
-- has_role must remain executable — it is called from RLS policies evaluated as the requesting role.
