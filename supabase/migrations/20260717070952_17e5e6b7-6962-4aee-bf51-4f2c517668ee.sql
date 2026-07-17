ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;