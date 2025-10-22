-- Function to automatically assign manager role to specific email
CREATE OR REPLACE FUNCTION public.handle_manager_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email is the manager email
  IF NEW.email = 'menuonline483@gmail.com' THEN
    -- Insert manager role for this user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'manager')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run on user signup
CREATE TRIGGER on_auth_user_created_assign_manager
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_manager_signup();