-- Add notes field to orders table for optional customer messages
ALTER TABLE public.orders 
ADD COLUMN notes TEXT;