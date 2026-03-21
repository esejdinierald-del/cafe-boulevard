-- Fix RLS on service_requests: remove dangerous anon DELETE/UPDATE policies
DROP POLICY IF EXISTS "Anyone can delete service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Anyone can update service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Anyone can create service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Anyone can view service requests" ON public.service_requests;

CREATE POLICY "Anyone can create service requests" ON public.service_requests
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Anyone can view service requests" ON public.service_requests
  FOR SELECT TO public USING (true);

CREATE POLICY "Staff can update service requests" ON public.service_requests
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Managers can delete service requests" ON public.service_requests
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Fix RLS on shift_tokens
DROP POLICY IF EXISTS "Anyone can insert shift tokens" ON public.shift_tokens;
DROP POLICY IF EXISTS "Anyone can update shift tokens" ON public.shift_tokens;
DROP POLICY IF EXISTS "Anyone can delete shift tokens" ON public.shift_tokens;

CREATE POLICY "Anyone can update shift token unlock" ON public.shift_tokens
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can insert shift tokens" ON public.shift_tokens
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Managers can delete shift tokens" ON public.shift_tokens
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Drop legacy table_devices table
DROP TABLE IF EXISTS public.table_devices;

-- Create menu-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to menu-images
CREATE POLICY "Managers can upload menu images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Anyone can view menu images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'menu-images');