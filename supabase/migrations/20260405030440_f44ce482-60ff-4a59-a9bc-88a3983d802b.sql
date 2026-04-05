
-- =============================================
-- 1. SHIFT_TOKENS: Lock down all public access
-- =============================================
DROP POLICY IF EXISTS "Anyone can view active shift tokens" ON public.shift_tokens;
DROP POLICY IF EXISTS "Anyone can insert shift tokens" ON public.shift_tokens;
DROP POLICY IF EXISTS "Anyone can update shift token unlock" ON public.shift_tokens;

-- Only managers/admins can view shift tokens
CREATE POLICY "Managers can view shift tokens"
ON public.shift_tokens
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Only managers/admins can create shift tokens
CREATE POLICY "Managers can insert shift tokens"
ON public.shift_tokens
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Only managers/admins can update shift tokens
CREATE POLICY "Managers can update shift tokens"
ON public.shift_tokens
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- =============================================
-- 2. ORDERS: Remove public UPDATE policy
-- =============================================
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;

-- =============================================
-- 3. SERVICE_REQUESTS: Restrict UPDATE to staff
-- =============================================
DROP POLICY IF EXISTS "Staff can update service requests" ON public.service_requests;

CREATE POLICY "Staff can update service requests"
ON public.service_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- =============================================
-- 4. CHAT_SESSIONS: Remove public UPDATE
-- =============================================
DROP POLICY IF EXISTS "Anyone can update chat sessions" ON public.chat_sessions;

-- Allow update only matching session (for the edge function which uses service role)
-- The staff-chat edge function uses service role key, so it bypasses RLS.
-- No public update policy needed.

-- =============================================
-- 5. STORAGE: Fix menu-images policies
-- =============================================
DROP POLICY IF EXISTS "Managers can upload menu images" ON storage.objects;

CREATE POLICY "Managers can upload menu images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can update menu images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can delete menu images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'menu-images'
  AND has_role(auth.uid(), 'manager'::app_role)
);
