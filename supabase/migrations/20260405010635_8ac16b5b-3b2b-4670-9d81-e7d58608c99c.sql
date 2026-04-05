-- Create the trigger on auth.users for auto-assigning manager roles
CREATE OR REPLACE TRIGGER on_manager_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_manager_signup();