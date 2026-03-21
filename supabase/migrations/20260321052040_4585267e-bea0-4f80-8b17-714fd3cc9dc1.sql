
ALTER TABLE public.shift_tokens ADD COLUMN unlocked boolean NOT NULL DEFAULT false;

CREATE POLICY "Anyone can update shift tokens"
ON public.shift_tokens
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
