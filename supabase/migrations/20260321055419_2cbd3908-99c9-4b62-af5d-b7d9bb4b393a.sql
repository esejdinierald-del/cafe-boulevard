
-- Remove public DELETE on chat_sessions - only managers can delete
DROP POLICY IF EXISTS "Anyone can delete chat sessions" ON public.chat_sessions;

CREATE POLICY "Managers can delete chat sessions"
ON public.chat_sessions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'manager'::app_role)
);
