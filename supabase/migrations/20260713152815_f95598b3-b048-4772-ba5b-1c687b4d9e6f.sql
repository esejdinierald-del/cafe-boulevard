
-- Fiscal receipts internal register
CREATE TABLE public.fiscal_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  fiscal_number TEXT NOT NULL UNIQUE,
  fiscal_year INT NOT NULL,
  seq_in_year BIGINT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  vat_amount NUMERIC(12,2) NOT NULL,
  net_amount NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL DEFAULT 'pos',
  operator_name TEXT,
  table_number INT,
  items JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, seq_in_year)
);

GRANT SELECT ON public.fiscal_receipts TO authenticated;
GRANT ALL ON public.fiscal_receipts TO service_role;

ALTER TABLE public.fiscal_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fiscal receipts"
  ON public.fiscal_receipts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_fiscal_receipts_issued_at ON public.fiscal_receipts (issued_at DESC);
CREATE INDEX idx_fiscal_receipts_year ON public.fiscal_receipts (fiscal_year);

-- Trigger: auto-create fiscal receipt when a sale transaction is inserted
CREATE OR REPLACE FUNCTION public.create_fiscal_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INT;
  v_seq BIGINT;
  v_total NUMERIC(12,2);
  v_vat_rate NUMERIC(5,2) := 20.00;
  v_vat NUMERIC(12,2);
  v_net NUMERIC(12,2);
  v_source TEXT;
  v_table INT;
BEGIN
  IF NEW.type <> 'sale' THEN
    RETURN NEW;
  END IF;

  v_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::INT;
  v_total := ROUND(COALESCE(NEW.amount, 0)::NUMERIC, 2);
  -- Price is gross (VAT included); split as net + vat
  v_net := ROUND(v_total / (1 + v_vat_rate/100), 2);
  v_vat := ROUND(v_total - v_net, 2);

  -- Try to enrich from pos_orders if we have order_id
  v_source := 'pos';
  v_table := NEW.table_number;
  IF NEW.order_id IS NOT NULL THEN
    SELECT COALESCE(source, 'pos'), table_number
      INTO v_source, v_table
      FROM public.pos_orders
      WHERE id = NEW.order_id;
  END IF;

  -- Next sequence for this year
  SELECT COALESCE(MAX(seq_in_year), 0) + 1
    INTO v_seq
    FROM public.fiscal_receipts
    WHERE fiscal_year = v_year;

  INSERT INTO public.fiscal_receipts (
    transaction_id, fiscal_number, fiscal_year, seq_in_year,
    issued_at, total_amount, vat_rate, vat_amount, net_amount,
    source, operator_name, table_number, items
  ) VALUES (
    NEW.id,
    v_year::TEXT || '-' || LPAD(v_seq::TEXT, 6, '0'),
    v_year, v_seq,
    COALESCE(NEW.created_at, now()),
    v_total, v_vat_rate, v_vat, v_net,
    COALESCE(v_source, 'pos'),
    NEW.operator_name,
    v_table,
    NEW.items
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_fiscal_receipt
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.create_fiscal_receipt();

-- Backfill: create fiscal receipts for existing sale transactions
INSERT INTO public.fiscal_receipts (
  transaction_id, fiscal_number, fiscal_year, seq_in_year,
  issued_at, total_amount, vat_rate, vat_amount, net_amount,
  source, operator_name, table_number, items
)
SELECT
  t.id,
  EXTRACT(YEAR FROM t.created_at)::INT::TEXT || '-' ||
    LPAD(ROW_NUMBER() OVER (
      PARTITION BY EXTRACT(YEAR FROM t.created_at)
      ORDER BY t.created_at, t.id
    )::TEXT, 6, '0'),
  EXTRACT(YEAR FROM t.created_at)::INT,
  ROW_NUMBER() OVER (
    PARTITION BY EXTRACT(YEAR FROM t.created_at)
    ORDER BY t.created_at, t.id
  ),
  t.created_at,
  ROUND(t.amount::NUMERIC, 2),
  20.00,
  ROUND(t.amount::NUMERIC - (t.amount::NUMERIC / 1.20), 2),
  ROUND(t.amount::NUMERIC / 1.20, 2),
  COALESCE(po.source, 'pos'),
  t.operator_name,
  COALESCE(t.table_number, po.table_number),
  t.items
FROM public.transactions t
LEFT JOIN public.pos_orders po ON po.id = t.order_id
WHERE t.type = 'sale'
ON CONFLICT DO NOTHING;
