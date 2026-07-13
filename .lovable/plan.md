# Plan: Unique constraint për transactions + thjeshtim i pos-confirm-order

Verifikova që nuk ka rreshta dublikatë ekzistues në `transactions` për `(order_id, type)` — migrimi mund të aplikohet direkt pa pastrim paraprak.

## 1. Migrim SQL

Në një migrim të vetëm:

```sql
ALTER TABLE public.transactions
  ADD CONSTRAINT uq_transactions_order_sale UNIQUE (order_id, type);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id
  ON public.transactions(order_id);
```

## 2. Rifreskim i `supabase/functions/pos-confirm-order/index.ts`

Në bllokun që regjistron shitjen kur `allConfirmed`:

- Hiq `select` paraprak të `existingTxn`.
- Bëj direkt `insert` në `transactions`.
- Nëse gabimi ka `code === '23505'` (unique violation), injoroje në heshtje (transaksioni tashmë ekziston — sjellje korrekte).
- Gabimet e tjera i logojmë si më parë me `console.error`.

Pjesa tjetër e funksionit (updating splits, marking order `ready`, decrement raw materials) mbetet e paprekur.

## Verifikim

- Migrimi kalon pa gabim (s'ka dublikatë).
- Deploy i `pos-confirm-order`; testim me konfirmim të një porosie — një rresht i vetëm në `transactions`, s'ka error në logje.
- Konfirmim i dyfishtë i së njëjtës porosi (race) nuk krijon dublikatë dhe nuk kthen 500.
