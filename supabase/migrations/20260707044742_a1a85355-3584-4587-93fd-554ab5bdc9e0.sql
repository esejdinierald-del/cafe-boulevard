-- ============================================================
-- BOULEVARD CAFE — POS SYSTEM MIGRATION
-- Përshtatur për schema-n ekzistuese: 'categories' (jo menu_categories),
-- 'tables' ekzistuese e ruajtur, GRANTs të shtuara.
-- ============================================================

-- 1. ZGJERO menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS for_bar BOOLEAN DEFAULT true;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS for_kitchen BOOLEAN DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. ZGJERO categories (i quajtur menu_categories në planin original)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.categories(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS for_bar BOOLEAN DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS for_kitchen BOOLEAN DEFAULT false;

-- 3. ZGJERO tables ekzistuese (mos e prek 'name', mos fusim rreshta të rinj)
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 4;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS location_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tables_status_check') THEN
    ALTER TABLE public.tables ADD CONSTRAINT tables_status_check
      CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning'));
  END IF;
END $$;

-- ============================================================
-- 4. TABELAT E REJA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'waiter', 'kitchen', 'bartender')),
    pin_code TEXT,
    email TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    location_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_members TO anon;
GRANT ALL ON public.staff_members TO service_role;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.pos_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    table_number INTEGER,
    mode TEXT DEFAULT 'table' CHECK (mode IN ('table', 'bar', 'delivery', 'takeaway')),
    items JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending_bar', 'pending_kitchen', 'ready', 'closed', 'cancelled')),
    total_amount DECIMAL(10,2) DEFAULT 0,
    operator_name TEXT,
    location_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    printed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_orders TO anon;
GRANT ALL ON public.pos_orders TO service_role;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_items_split (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('kitchen', 'bar')),
    items JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items_split TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items_split TO anon;
GRANT ALL ON public.order_items_split TO service_role;
ALTER TABLE public.order_items_split ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 0,
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'L', 'cope', 'ml', 'g')),
    min_threshold DECIMAL(10,3) DEFAULT 0,
    location_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_materials TO anon;
GRANT ALL ON public.raw_materials TO service_role;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    note TEXT,
    operator_name TEXT,
    location_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplies TO anon;
GRANT ALL ON public.supplies TO service_role;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.pos_orders(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'sale' CHECK (type IN ('sale', 'refund', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    items JSONB,
    operator_name TEXT,
    location_id UUID,
    table_number INTEGER,
    fiscal_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pos_orders_table_id ON public.pos_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status ON public.pos_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_split_order_id ON public.order_items_split(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_split_status ON public.order_items_split(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_raw_materials_low_stock ON public.raw_materials(quantity, min_threshold);

-- ============================================================
-- 6. REALTIME
-- ============================================================
ALTER TABLE public.pos_orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items_split REPLICA IDENTITY FULL;
ALTER TABLE public.tables REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_requests') THEN
    EXECUTE 'ALTER TABLE public.service_requests REPLICA IDENTITY FULL';
  END IF;
END $$;

-- ============================================================
-- 7. RLS (publike siç u kërkua — kontrolli i rolit bëhet në frontend)
-- ============================================================
DROP POLICY IF EXISTS "allow_all" ON public.staff_members;
DROP POLICY IF EXISTS "allow_all" ON public.pos_orders;
DROP POLICY IF EXISTS "allow_all" ON public.order_items_split;
DROP POLICY IF EXISTS "allow_all" ON public.raw_materials;
DROP POLICY IF EXISTS "allow_all" ON public.supplies;
DROP POLICY IF EXISTS "allow_all" ON public.transactions;

CREATE POLICY "allow_all" ON public.staff_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.pos_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.order_items_split FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.raw_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.supplies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Mos ekspozo pin_code përmes REST API
REVOKE SELECT (pin_code) ON public.staff_members FROM anon, authenticated;

-- ============================================================
-- 8. FUNKSIONE (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_staff_pin(p_pin TEXT)
RETURNS TABLE (id UUID, name TEXT, role TEXT, location_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.role, s.location_id
  FROM public.staff_members s
  WHERE s.pin_code = p_pin AND s.is_active = true
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_material(material_id UUID, amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.raw_materials
  SET quantity = quantity + amount, updated_at = NOW()
  WHERE id = material_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_supply(
  p_material_id UUID,
  p_quantity DECIMAL,
  p_note TEXT,
  p_operator_name TEXT,
  p_location_id UUID
)
RETURNS public.raw_materials
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.raw_materials;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Sasia duhet të jetë pozitive';
  END IF;

  INSERT INTO public.supplies (material_id, quantity, note, operator_name, location_id)
  VALUES (p_material_id, p_quantity, p_note, p_operator_name, p_location_id);

  UPDATE public.raw_materials
  SET quantity = quantity + p_quantity, updated_at = NOW()
  WHERE id = p_material_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_pos_order(
  p_order_id UUID,
  p_operator_name TEXT
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.pos_orders;
  v_txn public.transactions;
BEGIN
  SELECT * INTO v_order FROM public.pos_orders WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Porosia nuk u gjet';
  END IF;

  IF v_order.status = 'closed' THEN
    RAISE EXCEPTION 'Porosia është mbyllur tashmë';
  END IF;

  INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
  VALUES (v_order.id, 'sale', v_order.total_amount, v_order.items, p_operator_name, v_order.location_id, v_order.table_number)
  RETURNING * INTO v_txn;

  UPDATE public.pos_orders
  SET status = 'closed', closed_at = NOW(), operator_name = p_operator_name
  WHERE id = p_order_id;

  IF v_order.table_id IS NOT NULL THEN
    UPDATE public.tables SET status = 'available' WHERE id = v_order.table_id;
  END IF;

  RETURN v_txn;
END;
$$;

-- ============================================================
-- 9. TË DHËNA FILLESTARE
-- ============================================================

-- staff_members: fut vetëm nëse tabela është bosh
INSERT INTO public.staff_members (name, role, pin_code)
SELECT * FROM (VALUES
  ('Admin', 'admin', '0000'),
  ('Petrit Lala', 'manager', '1111'),
  ('Xhon Gega', 'waiter', '1234'),
  ('Maria Rama', 'waiter', '5678'),
  ('Pandi Kola', 'kitchen', '9999')
) AS v(name, role, pin_code)
WHERE NOT EXISTS (SELECT 1 FROM public.staff_members);

-- raw_materials: fut vetëm nëse tabela është bosh
INSERT INTO public.raw_materials (name, quantity, unit, min_threshold)
SELECT * FROM (VALUES
  ('Kafe e zezë', 5, 'kg', 0.5),
  ('Qumësht', 10, 'L', 1),
  ('Vodka', 2000, 'ml', 200),
  ('Martini', 1500, 'ml', 200),
  ('Fernet Branca', 1000, 'ml', 100),
  ('Birra Korça', 100, 'cope', 10),
  ('Coca Cola', 80, 'cope', 10),
  ('Miell', 20, 'kg', 2),
  ('Djathë', 8, 'kg', 1),
  ('Sallam', 5, 'kg', 0.5),
  ('Domate', 10, 'kg', 1)
) AS v(name, quantity, unit, min_threshold)
WHERE NOT EXISTS (SELECT 1 FROM public.raw_materials);
