
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  shift_token text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (true);

CREATE POLICY "Anyone can delete push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (true);

CREATE POLICY "Anyone can update push subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (true);
