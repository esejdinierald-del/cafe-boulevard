-- Create service_requests table for waiter calls
CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('waiter', 'bill')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to create requests (customers)
CREATE POLICY "Anyone can create service requests"
ON public.service_requests
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy to allow anyone to view requests (for dashboard)
CREATE POLICY "Anyone can view service requests"
ON public.service_requests
FOR SELECT
TO anon
USING (true);

-- Policy to allow anyone to update requests (for completing them)
CREATE POLICY "Anyone can update service requests"
ON public.service_requests
FOR UPDATE
TO anon
USING (true);

-- Create index for faster queries
CREATE INDEX idx_service_requests_status ON public.service_requests(status);
CREATE INDEX idx_service_requests_created_at ON public.service_requests(created_at DESC);

-- Enable realtime
ALTER TABLE public.service_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;