CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT INSERT ON public.orders TO anon, authenticated;