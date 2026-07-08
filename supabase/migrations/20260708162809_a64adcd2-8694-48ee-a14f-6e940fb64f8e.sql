
CREATE TABLE IF NOT EXISTS public.inv_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_products TO anon, authenticated;
GRANT ALL ON public.inv_products TO service_role;
ALTER TABLE public.inv_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_products_all" ON public.inv_products FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.inv_daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL UNIQUE,
  turn1_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  turn2_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_daily_entries TO anon, authenticated;
GRANT ALL ON public.inv_daily_entries TO service_role;
ALTER TABLE public.inv_daily_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_daily_entries_all" ON public.inv_daily_entries FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.inv_next_day_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_date DATE NOT NULL UNIQUE,
  stock_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  mulliri_fillim INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inv_next_day_stock TO anon, authenticated;
GRANT ALL ON public.inv_next_day_stock TO service_role;
ALTER TABLE public.inv_next_day_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_next_day_stock_all" ON public.inv_next_day_stock FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_inv_daily_entries_date ON public.inv_daily_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_next_day_stock_date ON public.inv_next_day_stock(stock_date DESC);

CREATE OR REPLACE FUNCTION public.inv_handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inv_daily_entries_updated_at ON public.inv_daily_entries;
CREATE TRIGGER inv_daily_entries_updated_at
  BEFORE UPDATE ON public.inv_daily_entries
  FOR EACH ROW EXECUTE FUNCTION public.inv_handle_updated_at();

DROP TRIGGER IF EXISTS inv_next_day_stock_updated_at ON public.inv_next_day_stock;
CREATE TRIGGER inv_next_day_stock_updated_at
  BEFORE UPDATE ON public.inv_next_day_stock
  FOR EACH ROW EXECUTE FUNCTION public.inv_handle_updated_at();
