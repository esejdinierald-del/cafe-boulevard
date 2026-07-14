-- Hash staff PINs with bcrypt (pgcrypto) instead of storing plaintext.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Migrate existing plaintext PINs to bcrypt hashes (no staff reset needed).
UPDATE public.staff_members
   SET pin_hash = extensions.crypt(pin_code, extensions.gen_salt('bf', 10))
 WHERE pin_hash IS NULL
   AND pin_code IS NOT NULL;

-- Verify a PIN by comparing against the stored bcrypt hash.
CREATE OR REPLACE FUNCTION public.verify_staff_pin(p_pin text)
RETURNS TABLE(id uuid, name text, role text, location_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.role, s.location_id
  FROM public.staff_members s
  WHERE s.pin_hash IS NOT NULL
    AND s.is_active = true
    AND s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
  LIMIT 1;
END;
$$;

-- Verify by name+PIN (used by verify-staff-pin edge function).
CREATE OR REPLACE FUNCTION public.verify_staff_pin_by_name(p_name text, p_pin text)
RETURNS TABLE(id uuid, name text, role text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.role
  FROM public.staff_members s
  WHERE s.name = btrim(p_name)
    AND s.is_active = true
    AND s.pin_hash IS NOT NULL
    AND s.pin_hash = extensions.crypt(p_pin, s.pin_hash)
  LIMIT 1;
END;
$$;

-- Hash-on-write helper for manage-staff (create/update PIN).
CREATE OR REPLACE FUNCTION public.set_staff_pin(p_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN duhet të jetë 4 shifra';
  END IF;
  UPDATE public.staff_members
     SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
         pin_code = NULL,
         updated_at = now()
   WHERE id = p_id;
END;
$$;

-- Restrict execution: only service_role (edge functions) may call these.
REVOKE ALL ON FUNCTION public.verify_staff_pin(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_staff_pin_by_name(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_staff_pin_by_name(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text) TO service_role;

-- Remove plaintext column after successful hash migration.
ALTER TABLE public.staff_members DROP COLUMN IF EXISTS pin_code;