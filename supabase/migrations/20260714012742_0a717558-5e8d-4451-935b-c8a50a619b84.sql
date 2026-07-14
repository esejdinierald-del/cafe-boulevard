-- Allow anon+authenticated clients to INSERT app_logs (client error logging).
-- Reads remain admin-only via existing "app_logs_read_admin" policy.
GRANT INSERT ON public.app_logs TO anon, authenticated;

DROP POLICY IF EXISTS "app_logs_insert_public" ON public.app_logs;
CREATE POLICY "app_logs_insert_public" ON public.app_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    severity IN ('info','warning','error','critical')
    AND event IS NOT NULL
    AND length(event) <= 500
  );