ALTER TABLE public.transactions
  ADD CONSTRAINT uq_transactions_order_sale UNIQUE (order_id, type);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id
  ON public.transactions(order_id);