ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS track_daily boolean NOT NULL DEFAULT true;