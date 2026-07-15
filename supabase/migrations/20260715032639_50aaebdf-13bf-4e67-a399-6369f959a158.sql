
-- 1. Add per-staff admin flag and password hash
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_password_hash TEXT;

-- 2. Set admin password (bcrypt via pgcrypto)
CREATE OR REPLACE FUNCTION public.set_staff_admin_password(p_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Fjalëkalimi duhet të ketë të paktën 6 karaktere';
  END IF;
  UPDATE public.staff_members
     SET admin_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 10))
   WHERE id = p_id;
END;
$$;

-- 3. Verify admin password (constant time via crypt)
CREATE OR REPLACE FUNCTION public.verify_staff_admin_password(p_staff_id uuid, p_password text)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.role
  FROM public.staff_members s
  WHERE s.id = p_staff_id
    AND s.is_active = true
    AND s.is_admin = true
    AND s.admin_password_hash IS NOT NULL
    AND s.admin_password_hash = extensions.crypt(p_password, s.admin_password_hash)
  LIMIT 1;
END;
$$;

-- 4. Grant admin to existing manager/admin roles and seed initial password "2025"
UPDATE public.staff_members
   SET is_admin = true
 WHERE role IN ('admin', 'manager')
    OR lower(name) = 'admin';

UPDATE public.staff_members
   SET admin_password_hash = extensions.crypt('2025', extensions.gen_salt('bf', 10))
 WHERE is_admin = true
   AND admin_password_hash IS NULL;
