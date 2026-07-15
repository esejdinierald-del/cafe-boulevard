
DROP FUNCTION IF EXISTS public.verify_staff_pin_by_name(text, text);

CREATE OR REPLACE FUNCTION public.verify_staff_pin_by_name(p_name text, p_pin text)
RETURNS TABLE(id uuid, name text, role text, is_admin boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.role, s.is_admin
  FROM public.staff_members s
  WHERE s.name = btrim(p_name)
    AND s.is_active = true
    AND s.pin_hash IS NOT NULL
    AND s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_staff_pin_by_name(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin_by_name(text, text) TO service_role;
