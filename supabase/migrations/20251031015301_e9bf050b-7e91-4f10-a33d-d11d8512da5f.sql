-- Update the manager signup function to allow both emails
CREATE OR REPLACE FUNCTION public.handle_manager_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the new user's email is one of the manager emails
  IF NEW.email IN ('menuonline483@gmail.com', 'sejdinierald@gmail.com') THEN
    -- Insert manager role for this user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;