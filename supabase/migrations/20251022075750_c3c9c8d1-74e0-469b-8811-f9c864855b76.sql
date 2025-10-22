-- Add DELETE policy for service_requests table
CREATE POLICY "Anyone can delete service requests"
ON public.service_requests
FOR DELETE
TO anon
USING (true);