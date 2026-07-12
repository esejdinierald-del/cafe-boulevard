CREATE TABLE IF NOT EXISTS public.shift_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  staff_name text NOT NULL DEFAULT 'Panjohur',
  sequence_number integer NOT NULL,
  turn_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_date, sequence_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_turns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_turns TO authenticated;
GRANT ALL ON public.shift_turns TO service_role;

ALTER TABLE public.shift_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shift_turns_public_read" ON public.shift_turns;
DROP POLICY IF EXISTS "shift_turns_public_insert" ON public.shift_turns;
DROP POLICY IF EXISTS "shift_turns_public_update" ON public.shift_turns;
DROP POLICY IF EXISTS "shift_turns_public_delete" ON public.shift_turns;
DROP POLICY IF EXISTS "shift_turns_all_anon" ON public.shift_turns;
DROP POLICY IF EXISTS "shift_turns_all_auth" ON public.shift_turns;

CREATE POLICY "shift_turns_all_anon"
  ON public.shift_turns
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "shift_turns_all_auth"
  ON public.shift_turns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shift_turns_entry_date_sequence
  ON public.shift_turns (entry_date, sequence_number);

CREATE OR REPLACE TRIGGER update_shift_turns_updated_at
  BEFORE UPDATE ON public.shift_turns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();