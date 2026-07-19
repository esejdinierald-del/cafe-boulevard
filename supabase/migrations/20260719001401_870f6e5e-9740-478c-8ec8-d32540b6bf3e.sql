ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_members_phone ON public.staff_members(phone);
CREATE INDEX IF NOT EXISTS idx_staff_members_telegram_chat_id ON public.staff_members(telegram_chat_id);