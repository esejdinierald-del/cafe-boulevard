
CREATE TABLE public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station text NOT NULL DEFAULT 'arka',
  kind text NOT NULL,
  title text,
  receipt_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_by text,
  table_code text,
  amount numeric,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  printed_at timestamptz
);

CREATE INDEX idx_print_jobs_status_station ON public.print_jobs (station, status, created_at);
CREATE INDEX idx_print_jobs_creator ON public.print_jobs (created_by, status);

GRANT SELECT, INSERT, UPDATE ON public.print_jobs TO anon, authenticated;
GRANT ALL ON public.print_jobs TO service_role;

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read print_jobs"   ON public.print_jobs FOR SELECT USING (true);
CREATE POLICY "Public insert print_jobs" ON public.print_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update print_jobs" ON public.print_jobs FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE public.print_jobs REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
