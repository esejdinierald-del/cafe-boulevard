ALTER TABLE public.menu_items 
  ADD COLUMN offer_price integer DEFAULT NULL,
  ADD COLUMN offer_start_time time DEFAULT NULL,
  ADD COLUMN offer_end_time time DEFAULT NULL;