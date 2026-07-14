
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (table_number IS NOT NULL AND rating BETWEEN 1 AND 5);

DROP POLICY IF EXISTS "Anyone can create service requests" ON public.service_requests;
CREATE POLICY "Anyone can create service requests" ON public.service_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (table_number IS NOT NULL AND request_type IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert song requests" ON public.song_requests;
CREATE POLICY "Anyone can insert song requests" ON public.song_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (table_number IS NOT NULL AND youtube_url IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can insert chat sessions" ON public.chat_sessions;
CREATE POLICY "Anyone can insert chat sessions" ON public.chat_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (session_id IS NOT NULL AND length(session_id) > 0);

DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can register push subscription" ON public.push_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth IS NOT NULL);
