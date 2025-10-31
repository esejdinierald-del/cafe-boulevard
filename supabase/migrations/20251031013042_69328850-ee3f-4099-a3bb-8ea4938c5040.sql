
-- Create trigger to automatically assign manager role for specific email
CREATE TRIGGER on_manager_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_manager_signup();
