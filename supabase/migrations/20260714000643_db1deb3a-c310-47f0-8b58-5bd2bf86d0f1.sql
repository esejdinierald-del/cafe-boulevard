
DROP POLICY IF EXISTS "Staff can insert print_jobs" ON public.print_jobs;
DROP POLICY IF EXISTS "Staff can update print_jobs" ON public.print_jobs;
CREATE POLICY "Managers can insert print_jobs" ON public.print_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Managers can update print_jobs" ON public.print_jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Staff can update push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Staff can delete push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Managers can update push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Managers can delete push subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
