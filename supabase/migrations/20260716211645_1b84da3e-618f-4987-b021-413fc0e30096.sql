CREATE OR REPLACE FUNCTION public.verify_staff_admin_password_by_name(p_name text, p_password text)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.role
  FROM public.staff_members s
  WHERE s.name = btrim(p_name)
    AND s.is_active = true
    AND s.is_admin = true
    AND s.admin_password_hash IS NOT NULL
    AND s.admin_password_hash = extensions.crypt(p_password, s.admin_password_hash)
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reopen_shift_turn(p_turn_id uuid)
RETURNS shift_turns
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row public.shift_turns;
BEGIN
  UPDATE public.shift_turns
     SET is_locked = false, locked_at = NULL
   WHERE id = p_turn_id
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Turni nuk u gjet';
  END IF;
  RETURN v_row;
END;
$$;