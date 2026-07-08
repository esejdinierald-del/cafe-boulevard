
-- Recipes: link menu items to raw materials
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL,
  material_id uuid NOT NULL,
  quantity_needed numeric(10,3) NOT NULL CHECK (quantity_needed > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipes_menu_material_unique UNIQUE (menu_item_id, material_id)
);

GRANT SELECT ON public.recipes TO anon, authenticated;
GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read recipes"
  ON public.recipes FOR SELECT
  USING (true);

-- updated_at trigger
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.recipes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recipes;

-- Decrement material function
CREATE OR REPLACE FUNCTION public.decrement_material(material_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raw_materials
  SET quantity = GREATEST(quantity - amount, 0),
      updated_at = now()
  WHERE id = material_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_material(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_material(uuid, numeric) TO service_role;
