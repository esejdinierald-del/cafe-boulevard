
CREATE TABLE public.shift_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  shift_start timestamp with time zone NOT NULL,
  shift_end timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shift tokens" ON public.shift_tokens
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert shift tokens" ON public.shift_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete shift tokens" ON public.shift_tokens
  FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_tokens;
