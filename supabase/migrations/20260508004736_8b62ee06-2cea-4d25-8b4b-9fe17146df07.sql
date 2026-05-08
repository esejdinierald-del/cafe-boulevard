
-- Add group column to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS group_name TEXT NOT NULL DEFAULT 'BANAKU';

-- Update existing categories into groups
UPDATE public.categories SET group_name = 'BANAKU' WHERE name IN ('Caffeteria', 'Bevande Frede', 'Birra', 'Alkolike&Vodka&Amaro', 'Vinoteca', 'Coctailes');
UPDATE public.categories SET group_name = 'GUZHINA' WHERE name IN ('Antipastat', 'Mengjesi', 'Finger Food Chicken', 'Pizza');

-- Insert new DREKA group categories
INSERT INTO public.categories (name, name_en, display_order, group_name)
VALUES 
  ('Dreka', 'Lunch', 11, 'DREKA'),
  ('Menu Javore Delivery', 'Weekly Delivery Menu', 12, 'DREKA');
