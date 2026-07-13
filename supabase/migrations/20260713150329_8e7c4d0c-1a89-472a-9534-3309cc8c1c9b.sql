
-- =========================================================
-- FAZA 1A: Audit log + DELETE lockdown + pos_orders.source
-- =========================================================

-- 1) audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,          -- 'INSERT' | 'UPDATE' | 'DELETE'
  table_name TEXT NOT NULL,
  row_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_time ON public.audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor      ON public.audit_log(actor_user_id, created_at DESC);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL    ON public.audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO authenticated, service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_read_admin_manager" ON public.audit_log;
CREATE POLICY "audit_log_read_admin_manager" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );
-- No INSERT/UPDATE/DELETE policies => immutable to clients; only service_role writes via trigger

-- 2) Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id TEXT;
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_row_id := (v_old->>'id');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_row_id := (v_new->>'id');
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row_id := (v_new->>'id');
    -- Skip no-op updates
    IF v_old = v_new THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_log(actor_user_id, action, table_name, row_id, old_data, new_data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_row_id, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3) Attach audit triggers to key tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'shift_turns', 'raw_materials', 'inv_daily_entries',
    'inv_next_day_stock', 'inv_products', 'pos_orders', 'transactions', 'supplies'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$s
        FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t
    );
  END LOOP;
END $$;

-- 4) DELETE lockdown: only admins may delete on inventory/operations tables
--    (INSERT/UPDATE stay as-is for now to avoid breaking waiter UI which uses anon role;
--     Faza 1B will move writes through service_role edge functions.)

-- shift_turns
DROP POLICY IF EXISTS "shift_turns_delete_admin_only" ON public.shift_turns;
CREATE POLICY "shift_turns_delete_admin_only" ON public.shift_turns
  FOR DELETE TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'));

-- inv_daily_entries
DROP POLICY IF EXISTS "inv_daily_entries_delete_admin_only" ON public.inv_daily_entries;
CREATE POLICY "inv_daily_entries_delete_admin_only" ON public.inv_daily_entries
  FOR DELETE TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'));

-- inv_next_day_stock
DROP POLICY IF EXISTS "inv_next_day_stock_delete_admin_only" ON public.inv_next_day_stock;
CREATE POLICY "inv_next_day_stock_delete_admin_only" ON public.inv_next_day_stock
  FOR DELETE TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'));

-- inv_products
DROP POLICY IF EXISTS "inv_products_delete_admin_only" ON public.inv_products;
CREATE POLICY "inv_products_delete_admin_only" ON public.inv_products
  FOR DELETE TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'));

-- raw_materials — add explicit DELETE policy (currently no DELETE policy => already blocked, but make it explicit for admin)
DROP POLICY IF EXISTS "raw_materials_delete_admin_only" ON public.raw_materials;
CREATE POLICY "raw_materials_delete_admin_only" ON public.raw_materials
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- supplies — historical record; only admin may delete
DROP POLICY IF EXISTS "supplies_delete_admin_only" ON public.supplies;
CREATE POLICY "supplies_delete_admin_only" ON public.supplies
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- pos_orders — cancellations happen via status update; only admin may hard-delete
DROP POLICY IF EXISTS "pos_orders_delete_admin_only" ON public.pos_orders;
CREATE POLICY "pos_orders_delete_admin_only" ON public.pos_orders
  FOR DELETE TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'));

-- transactions — financial record; only admin may hard-delete
DROP POLICY IF EXISTS "transactions_delete_admin_only" ON public.transactions;
CREATE POLICY "transactions_delete_admin_only" ON public.transactions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) Prep column for unified orders (Faza 1B will migrate legacy `orders`)
ALTER TABLE public.pos_orders
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'pos';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_orders_source_check'
  ) THEN
    ALTER TABLE public.pos_orders
      ADD CONSTRAINT pos_orders_source_check
      CHECK (source IN ('pos','client','takeaway','delivery'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_orders_source ON public.pos_orders(source);
