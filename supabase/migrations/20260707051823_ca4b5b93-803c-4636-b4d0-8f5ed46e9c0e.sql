
-- Drop permissive allow_all policies
DROP POLICY IF EXISTS allow_all ON public.pos_orders;
DROP POLICY IF EXISTS allow_all ON public.order_items_split;
DROP POLICY IF EXISTS allow_all ON public.transactions;
DROP POLICY IF EXISTS allow_all ON public.raw_materials;
DROP POLICY IF EXISTS allow_all ON public.supplies;
DROP POLICY IF EXISTS allow_all ON public.staff_members;

-- Public read policies (writes go only through edge functions using service_role, which bypasses RLS)
CREATE POLICY "Public read pos_orders" ON public.pos_orders FOR SELECT USING (true);
CREATE POLICY "Public read order_items_split" ON public.order_items_split FOR SELECT USING (true);
CREATE POLICY "Public read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Public read raw_materials" ON public.raw_materials FOR SELECT USING (true);
CREATE POLICY "Public read supplies" ON public.supplies FOR SELECT USING (true);
-- staff_members: intentionally NO policies for anon/authenticated -> fully blocked from Data API.
-- Verification is done through SECURITY DEFINER RPC verify_staff_pin.

-- Revoke write privileges from anon/authenticated at the GRANT level as defense-in-depth
REVOKE INSERT, UPDATE, DELETE ON public.pos_orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items_split FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.raw_materials FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.supplies FROM anon, authenticated;
REVOKE ALL ON public.staff_members FROM anon, authenticated;

-- Ensure SELECT grants remain for reads (idempotent)
GRANT SELECT ON public.pos_orders TO anon, authenticated;
GRANT SELECT ON public.order_items_split TO anon, authenticated;
GRANT SELECT ON public.transactions TO anon, authenticated;
GRANT SELECT ON public.raw_materials TO anon, authenticated;
GRANT SELECT ON public.supplies TO anon, authenticated;

-- Service role keeps full access on all
GRANT ALL ON public.pos_orders TO service_role;
GRANT ALL ON public.order_items_split TO service_role;
GRANT ALL ON public.transactions TO service_role;
GRANT ALL ON public.raw_materials TO service_role;
GRANT ALL ON public.supplies TO service_role;
GRANT ALL ON public.staff_members TO service_role;
