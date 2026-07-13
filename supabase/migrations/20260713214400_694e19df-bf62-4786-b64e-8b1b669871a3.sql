
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
REVOKE SELECT ON public.orders FROM anon;
CREATE POLICY "Staff can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);
