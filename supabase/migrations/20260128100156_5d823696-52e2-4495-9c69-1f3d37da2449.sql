-- Enable realtime for service_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

-- Enable realtime for orders table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;