
-- Tighten SELECT policies: replace `authenticated USING (true)` with a real
-- role check (manager or admin). Staff read flows go through Edge Functions
-- with service_role, so they are unaffected. See audit CRITICAL #4.

DO $$
DECLARE
  t TEXT;
  p TEXT;
  pairs TEXT[][] := ARRAY[
    ARRAY['transactions',       'Staff can view transactions'],
    ARRAY['pos_orders',         'Staff can view pos_orders'],
    ARRAY['raw_materials',      'Staff can view raw_materials'],
    ARRAY['recipes',            'Staff can view recipes'],
    ARRAY['supplies',           'Staff can view supplies'],
    ARRAY['order_items_split',  'Staff can view order_items_split'],
    ARRAY['print_jobs',         'Staff can view print_jobs'],
    ARRAY['push_subscriptions', 'Staff can view push subscriptions'],
    ARRAY['inv_daily_entries',  'Staff can view inv_daily_entries'],
    ARRAY['inv_next_day_stock', 'Staff can view inv_next_day_stock'],
    ARRAY['inv_products',       'Staff can view inv_products'],
    ARRAY['shift_turns',        'Staff can view shift_turns']
  ];
  pair TEXT[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY pairs LOOP
    t := pair[1];
    p := pair[2];
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),''manager''::app_role) OR public.has_role(auth.uid(),''admin''::app_role))',
      'Managers view ' || t, t
    );
  END LOOP;
END $$;

-- Audit MEDIUM #18: revoke stale write GRANTs on inv_* tables so RLS is the
-- only line of defense (matches the pattern already used for pos_orders etc.).
REVOKE INSERT, UPDATE, DELETE ON public.inv_products       FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inv_daily_entries  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inv_next_day_stock FROM anon, authenticated;
