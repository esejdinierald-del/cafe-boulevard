
ALTER TABLE public.song_requests ADD COLUMN IF NOT EXISTS played_at timestamptz;

CREATE TABLE IF NOT EXISTS public.playlist_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_song_id uuid REFERENCES public.song_requests(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.playlist_state TO anon, authenticated;
GRANT UPDATE ON public.playlist_state TO authenticated;
GRANT ALL ON public.playlist_state TO service_role;

ALTER TABLE public.playlist_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view playlist_state" ON public.playlist_state
  FOR SELECT USING (true);

CREATE POLICY "Staff can update playlist_state" ON public.playlist_state
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

INSERT INTO public.playlist_state (id, current_song_id, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, now())
ON CONFLICT (id) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_state;
