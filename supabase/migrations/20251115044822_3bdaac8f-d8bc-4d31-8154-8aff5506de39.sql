-- Create table to store smart devices mapped to tables
CREATE TABLE public.table_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT DEFAULT 'heater',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.table_devices ENABLE ROW LEVEL SECURITY;

-- Anyone can view table devices (needed for customers to turn on heaters)
CREATE POLICY "Anyone can view table devices"
ON public.table_devices
FOR SELECT
USING (true);

-- Only managers can manage devices
CREATE POLICY "Managers can insert table devices"
ON public.table_devices
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update table devices"
ON public.table_devices
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete table devices"
ON public.table_devices
FOR DELETE
USING (has_role(auth.uid(), 'manager'::app_role));

-- Insert the two heaters you showed me
INSERT INTO public.table_devices (table_number, device_id, device_name, device_type)
VALUES 
  ('1', 'bf4e1f7a553047a55capma', 'Ngrohëse Tavolinë 1', 'heater'),
  ('2', 'bf541f894f0a15480ay4ag', 'Ngrohëse Tavolinë 2', 'heater');