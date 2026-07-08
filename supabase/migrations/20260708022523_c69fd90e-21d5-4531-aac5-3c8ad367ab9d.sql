DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tables; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items_split; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.pos_orders REPLICA IDENTITY FULL;
ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.order_items_split REPLICA IDENTITY FULL;