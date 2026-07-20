REVOKE EXECUTE ON FUNCTION public.void_pos_item(uuid, uuid, numeric, numeric, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_shiriti_delta(jsonb, integer, timestamptz) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_pos_split(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_pos_split(uuid, text) FROM anon, authenticated;