CREATE TABLE public.ai_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ai_knowledge" ON public.ai_knowledge FOR SELECT TO public USING (true);
CREATE POLICY "Managers can insert ai_knowledge" ON public.ai_knowledge FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Managers can update ai_knowledge" ON public.ai_knowledge FOR UPDATE TO public USING (has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Managers can delete ai_knowledge" ON public.ai_knowledge FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));