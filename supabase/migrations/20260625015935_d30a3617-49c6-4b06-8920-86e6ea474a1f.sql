CREATE TABLE public.song_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text NOT NULL,
  youtube_url text NOT NULL,
  video_id text NOT NULL,
  title text NOT NULL,
  thumbnail text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'played')),
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX idx_song_requests_table_status ON public.song_requests(table_number, status);
CREATE INDEX idx_song_requests_status_created ON public.song_requests(status, created_at);

GRANT SELECT, INSERT ON public.song_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.song_requests TO authenticated;
GRANT ALL ON public.song_requests TO service_role;

ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert song requests" ON public.song_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can view song requests" ON public.song_requests
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Staff can update song requests" ON public.song_requests
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Staff can delete song requests" ON public.song_requests
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.song_requests;