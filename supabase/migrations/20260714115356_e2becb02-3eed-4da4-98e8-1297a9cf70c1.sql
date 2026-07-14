CREATE OR REPLACE FUNCTION public.set_staff_pin(p_id uuid, p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_pin !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'PIN duhet të jetë 4 shifra';
  END IF;
  UPDATE public.staff_members
     SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10))
   WHERE id = p_id;
END;
$function$;