
-- Allow anon to update orders (needed for staff who use simple password auth)
CREATE POLICY "Anyone can update orders" ON public.orders
FOR UPDATE
USING (true);
