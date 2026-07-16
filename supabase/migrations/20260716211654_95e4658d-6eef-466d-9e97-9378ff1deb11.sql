REVOKE ALL ON FUNCTION public.verify_staff_admin_password_by_name(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_admin_password_by_name(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_reopen_shift_turn(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reopen_shift_turn(uuid) TO service_role;