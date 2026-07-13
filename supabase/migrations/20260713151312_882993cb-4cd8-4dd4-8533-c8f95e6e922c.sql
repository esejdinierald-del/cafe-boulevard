
-- ============ 2.1 INDEXES ============
CREATE INDEX IF NOT EXISTS idx_pos_orders_table_status ON public.pos_orders(table_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_created_at   ON public.pos_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date_type  ON public.transactions(created_at DESC, type);
CREATE INDEX IF NOT EXISTS idx_shift_turns_date_locked ON public.shift_turns(entry_date, is_locked);
CREATE INDEX IF NOT EXISTS idx_shift_turns_staff       ON public.shift_turns(staff_name);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name      ON public.raw_materials(name);
CREATE INDEX IF NOT EXISTS idx_supplies_material_date  ON public.supplies(material_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_category     ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status       ON public.print_jobs(status, created_at DESC);

-- ============ 2.4 LOW STOCK THRESHOLD ============
ALTER TABLE public.raw_materials
  ADD COLUMN IF NOT EXISTS min_threshold NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT false;

-- ============ 2.5 SUPPLIER ORDERS ============
CREATE TABLE IF NOT EXISTS public.supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_orders TO authenticated;
GRANT ALL ON public.supplier_orders TO service_role;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplier_orders_manage" ON public.supplier_orders;
CREATE POLICY "supplier_orders_manage" ON public.supplier_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_supplier_orders_updated ON public.supplier_orders;
CREATE TRIGGER trg_supplier_orders_updated
  BEFORE UPDATE ON public.supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_supplier_orders_audit ON public.supplier_orders;
CREATE TRIGGER trg_supplier_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON public.supplier_orders(status, created_at DESC);

-- ============ 3.2 PRODUCT COSTS ============
CREATE TABLE IF NOT EXISTS public.product_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  cost_per_unit NUMERIC NOT NULL CHECK (cost_per_unit >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_costs TO authenticated;
GRANT ALL ON public.product_costs TO service_role;
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_costs_manage" ON public.product_costs;
CREATE POLICY "product_costs_manage" ON public.product_costs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_product_costs_updated ON public.product_costs;
CREATE TRIGGER trg_product_costs_updated
  BEFORE UPDATE ON public.product_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_product_costs_material ON public.product_costs(material_id, effective_from DESC);

-- ============ 4.3 APP LOGS ============
CREATE TABLE IF NOT EXISTS public.app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,
  actor TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_logs TO authenticated;
GRANT ALL ON public.app_logs TO service_role;
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_logs_read_admin" ON public.app_logs;
CREATE POLICY "app_logs_read_admin" ON public.app_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_app_logs_created ON public.app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_event ON public.app_logs(event, created_at DESC);
