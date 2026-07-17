ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS locked_by_name text NULL,
  ADD COLUMN IF NOT EXISTS locked_by_color text NULL;