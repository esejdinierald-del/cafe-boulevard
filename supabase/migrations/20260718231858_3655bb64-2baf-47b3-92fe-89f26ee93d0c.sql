
CREATE OR REPLACE FUNCTION public.notify_telegram_on_service_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_text text;
  v_url text := 'https://taqrxxikhwghmeofrpzs.supabase.co/functions/v1/notify-telegram';
  v_apikey text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcXJ4eGlraHdnaG1lb2ZycHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODIxMDksImV4cCI6MjA4OTU1ODEwOX0.rexHc50qxBVdhRfpXkT2dw7BfEWmUQtTgaphiQX7fWM';
  v_secret text := '32a12c788a82bbf4d19c0952300ee3c1ce911e6eabc0a4d79753ed870525c72a';
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  v_text := '🔔 <b>Thirrje e re shërbimi</b>' || E'\n' ||
            'Tavolina: <b>' || COALESCE(NEW.table_number, '?') || '</b>' || E'\n' ||
            'Lloji: ' || COALESCE(NEW.request_type, 'shërbim');

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_apikey,
      'Authorization', 'Bearer ' || v_apikey,
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object('text', v_text)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the insert on notification failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_telegram_service_requests ON public.service_requests;
CREATE TRIGGER trg_notify_telegram_service_requests
AFTER INSERT ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_telegram_on_service_request();
