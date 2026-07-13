
REVOKE EXECUTE ON FUNCTION public.verify_staff_pin(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_material(uuid, numeric) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_material(uuid, numeric) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_supply(uuid, numeric, text, text, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_pos_order(uuid, text) FROM anon, authenticated, PUBLIC;

DROP POLICY IF EXISTS "Anyone can view menu images" ON storage.objects;
