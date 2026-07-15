
REVOKE EXECUTE ON FUNCTION public.set_staff_admin_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_staff_admin_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_admin_password(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_staff_admin_password(uuid, text) TO service_role;
