-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Only managers can manage categories
CREATE POLICY "Managers can insert categories"
ON public.categories
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update categories"
ON public.categories
FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete categories"
ON public.categories
FOR DELETE
USING (public.has_role(auth.uid(), 'manager'));

-- Create menu_items table
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view available menu items
CREATE POLICY "Anyone can view menu items"
ON public.menu_items
FOR SELECT
USING (true);

-- Only managers can manage menu items
CREATE POLICY "Managers can insert menu items"
ON public.menu_items
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can update menu items"
ON public.menu_items
FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Managers can delete menu items"
ON public.menu_items
FOR DELETE
USING (public.has_role(auth.uid(), 'manager'));

-- Insert default categories
INSERT INTO public.categories (name, display_order) VALUES
('Kafe', 1),
('Pije', 2),
('Ëmbëlsira', 3);

-- Insert default menu items
INSERT INTO public.menu_items (category_id, name, description, price) 
SELECT 
    c.id,
    item.name,
    item.description,
    item.price
FROM public.categories c
CROSS JOIN LATERAL (
    VALUES 
        ('Kafe', 'Espresso', 'Kafe e fortë italiane', 80),
        ('Kafe', 'Cappuccino', 'Espresso me qumësht dhe shkumë', 120),
        ('Kafe', 'Macchiato', 'Espresso me një pikë qumësht', 100),
        ('Kafe', 'Latte', 'Kafe me shumë qumësht', 130),
        ('Pije', 'Coca Cola', '330ml', 150),
        ('Pije', 'Ujë Mineral', '500ml', 80),
        ('Ëmbëlsira', 'Croissant', 'Brumë francez i freskët', 120),
        ('Ëmbëlsira', 'Tiramisu', 'Ëmbëlsirë italiane klasike', 250)
) AS item(category, name, description, price)
WHERE c.name = item.category;