CREATE TABLE public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL UNIQUE,
  name text NOT NULL,
  qr_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tables TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tables TO authenticated;
GRANT ALL ON public.tables TO service_role;

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tables" ON public.tables
  FOR SELECT USING (true);

CREATE POLICY "Managers can insert tables" ON public.tables
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update tables" ON public.tables
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete tables" ON public.tables
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tables (number, name) VALUES
  (1, 'Tavolina 1'), (2, 'Tavolina 2'), (3, 'Tavolina 3'), (4, 'Tavolina 4'),
  (5, 'Tavolina 5'), (6, 'Tavolina 6'), (7, 'Tavolina 7'), (8, 'Tavolina 8'),
  (9, 'Tavolina 9'), (10, 'Tavolina 10'), (11, 'Tavolina 11'), (12, 'Tavolina 12'),
  (13, 'Tavolina 13'), (14, 'Tavolina 14'), (15, 'Tavolina 15'), (16, 'Tavolina 16'),
  (17, 'Tavolina 17'), (18, 'Tavolina 18'), (19, 'Tavolina 19'), (20, 'Tavolina 20');