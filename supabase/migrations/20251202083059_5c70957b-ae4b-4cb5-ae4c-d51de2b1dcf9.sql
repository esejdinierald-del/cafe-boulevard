-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true);

-- Allow anyone to view images
CREATE POLICY "Anyone can view menu images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Allow managers to upload images
CREATE POLICY "Managers can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' AND
  auth.role() = 'authenticated' AND
  has_role(auth.uid(), 'manager'::app_role)
);

-- Allow managers to update images
CREATE POLICY "Managers can update menu images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menu-images' AND
  auth.role() = 'authenticated' AND
  has_role(auth.uid(), 'manager'::app_role)
);

-- Allow managers to delete images
CREATE POLICY "Managers can delete menu images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-images' AND
  auth.role() = 'authenticated' AND
  has_role(auth.uid(), 'manager'::app_role)
);