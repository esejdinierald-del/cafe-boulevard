
-- 1) Add missing raw materials (canned drinks, spirits, wine, pizza ingredients)
INSERT INTO public.raw_materials (name, quantity, unit, min_threshold) VALUES
  ('Fanta', 0, 'cope', 12),
  ('Ivi', 0, 'cope', 12),
  ('Çaj i ftohtë', 0, 'cope', 12),
  ('Bravo', 0, 'cope', 12),
  ('Verë e hapur', 0, 'ml', 750),
  ('Gin', 0, 'ml', 500),
  ('Rum i bardhë', 0, 'ml', 500),
  ('Tequila', 0, 'ml', 500),
  ('Triple Sec', 0, 'ml', 500),
  ('Campari', 0, 'ml', 500),
  ('Vermouth i ëmbël', 0, 'ml', 500),
  ('Mocarella', 0, 'g', 500),
  ('Bazë pizze', 0, 'cope', 5)
ON CONFLICT DO NOTHING;

-- 2) Ensure recipes has proper policies for management (insert/update/delete)
DROP POLICY IF EXISTS "Manage recipes" ON public.recipes;
CREATE POLICY "Manage recipes" ON public.recipes FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO anon, authenticated;
GRANT ALL ON public.recipes TO service_role;

-- 3) Seed recipes for known menu items
DO $$
DECLARE
  mi RECORD;
  mat_id UUID;
BEGIN
  -- Canned drinks: 1 unit each
  FOR mi IN
    SELECT m.id, r.id AS material_id
    FROM public.menu_items m
    JOIN public.raw_materials r
      ON (UPPER(m.name) = 'COCA-COLA' AND r.name = 'Coca Cola')
      OR (UPPER(m.name) = 'FANTA' AND r.name = 'Fanta')
      OR (UPPER(m.name) = 'IVI' AND r.name = 'Ivi')
      OR (UPPER(m.name) = 'BRAVO' AND r.name = 'Bravo')
  LOOP
    INSERT INTO public.recipes (menu_item_id, material_id, quantity_needed)
    VALUES (mi.id, mi.material_id, 1)
    ON CONFLICT (menu_item_id, material_id) DO UPDATE SET quantity_needed = EXCLUDED.quantity_needed;
  END LOOP;

  -- Wine by glass / open wine
  SELECT id INTO mat_id FROM public.raw_materials WHERE name = 'Verë e hapur' LIMIT 1;
  IF mat_id IS NOT NULL THEN
    INSERT INTO public.recipes (menu_item_id, material_id, quantity_needed)
    SELECT id, mat_id, 200 FROM public.menu_items WHERE UPPER(name) = 'GOTE VERE'
    ON CONFLICT (menu_item_id, material_id) DO UPDATE SET quantity_needed = 200;

    INSERT INTO public.recipes (menu_item_id, material_id, quantity_needed)
    SELECT id, mat_id, 500 FROM public.menu_items WHERE UPPER(name) = 'VERE E HAPUR 0.5L'
    ON CONFLICT (menu_item_id, material_id) DO UPDATE SET quantity_needed = 500;
  END IF;

  -- Pizza Margarita: 250g miell + 150g mocarella + 100g domate
  DECLARE
    pizza_id UUID;
    m_miell UUID; m_moc UUID; m_dom UUID;
  BEGIN
    SELECT id INTO pizza_id FROM public.menu_items WHERE name = 'Pizza Margarita' LIMIT 1;
    SELECT id INTO m_miell FROM public.raw_materials WHERE name = 'Miell' LIMIT 1;
    SELECT id INTO m_moc FROM public.raw_materials WHERE name = 'Mocarella' LIMIT 1;
    SELECT id INTO m_dom FROM public.raw_materials WHERE name = 'Domate' LIMIT 1;
    IF pizza_id IS NOT NULL THEN
      IF m_miell IS NOT NULL THEN
        INSERT INTO public.recipes (menu_item_id, material_id, quantity_needed) VALUES (pizza_id, m_miell, 0.25)
        ON CONFLICT (menu_item_id, material_id) DO UPDATE SET quantity_needed = 0.25;
      END IF;
      IF m_moc IS NOT NULL THEN
        INSERT INTO public.recipes (menu_item_id, material_id, quantity_needed) VALUES (pizza_id, m_moc, 150)
        ON CONFLICT (menu_item_id, material_id) DO UPDATE SET quantity_needed = 150;
      END IF;
      IF m_dom IS NOT NULL THEN
        INSERT INTO public.recipes (menu_item_id, material_id, quantity_needed) VALUES (pizza_id, m_dom, 0.1)
        ON CONFLICT (menu_item_id, material_id) DO UPDATE SET quantity_needed = 0.1;
      END IF;
    END IF;
  END;
END $$;
