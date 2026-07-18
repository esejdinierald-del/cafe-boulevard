
CREATE OR REPLACE FUNCTION public.notify_push_on_service_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_url text := 'https://taqrxxikhwghmeofrpzs.supabase.co/functions/v1/send-push';
  v_apikey text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcXJ4eGlraHdnaG1lb2ZycHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODIxMDksImV4cCI6MjA4OTU1ODEwOX0.rexHc50qxBVdhRfpXkT2dw7BfEWmUQtTgaphiQX7fWM';
  v_secret text := '32a12c788a82bbf4d19c0952300ee3c1ce911e6eabc0a4d79753ed870525c72a';
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_apikey,
      'Authorization', 'Bearer ' || v_apikey,
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'title', '🔔 Thirrje shërbimi',
      'body', 'Tavolina ' || COALESCE(NEW.table_number, '?'),
      'type', 'service'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_push_on_service_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_push_service_requests ON public.service_requests;
CREATE TRIGGER trg_notify_push_service_requests
AFTER INSERT ON public.service_requests
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_push_on_service_request();


CREATE OR REPLACE FUNCTION public.notify_push_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_items_count int := 0;
  v_url text := 'https://taqrxxikhwghmeofrpzs.supabase.co/functions/v1/send-push';
  v_apikey text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcXJ4eGlraHdnaG1lb2ZycHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODIxMDksImV4cCI6MjA4OTU1ODEwOX0.rexHc50qxBVdhRfpXkT2dw7BfEWmUQtTgaphiQX7fWM';
  v_secret text := '32a12c788a82bbf4d19c0952300ee3c1ce911e6eabc0a4d79753ed870525c72a';
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  BEGIN
    IF jsonb_typeof(NEW.items) = 'array' THEN
      SELECT COALESCE(SUM(COALESCE((el->>'quantity')::int, 1)), jsonb_array_length(NEW.items))
        INTO v_items_count
        FROM jsonb_array_elements(NEW.items) el;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_items_count := 0;
  END;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_apikey,
      'Authorization', 'Bearer ' || v_apikey,
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'title', '🛎️ Porosi e re',
      'body', 'Tavolina ' || COALESCE(NEW.table_number, '?') || ' · ' || v_items_count || ' artikuj',
      'type', 'order'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_push_on_new_order() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_push_new_order ON public.orders;
CREATE TRIGGER trg_notify_push_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_push_on_new_order();
