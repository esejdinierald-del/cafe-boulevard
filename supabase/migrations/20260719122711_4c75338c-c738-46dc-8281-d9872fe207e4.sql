CREATE OR REPLACE FUNCTION public.notify_telegram_on_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_text text;
  v_items_count int := 0;
  v_items_lines text := '';
  v_url text := 'https://taqrxxikhwghmeofrpzs.supabase.co/functions/v1/notify-telegram';
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

      SELECT string_agg(
        '• ' || COALESCE(el->>'name', 'Artikull') ||
        ' × ' || COALESCE(el->>'quantity', '1') ||
        CASE
          WHEN COALESCE(el->>'notes','') <> '' THEN ' — <i>' || (el->>'notes') || '</i>'
          ELSE ''
        END,
        E'\n'
      )
        INTO v_items_lines
        FROM jsonb_array_elements(NEW.items) el;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_items_count := 0;
    v_items_lines := '';
  END;

  v_text := '🛎️ <b>Porosi e re nga klienti</b>' || E'\n' ||
            'Tavolina: <b>' || COALESCE(NEW.table_number, '?') || '</b>' || E'\n' ||
            'Artikuj: ' || v_items_count || ' · Totali: ' || COALESCE(NEW.total_price, 0) || ' L' ||
            CASE WHEN COALESCE(v_items_lines,'') <> '' THEN E'\n\n' || v_items_lines ELSE '' END ||
            CASE WHEN COALESCE(NEW.notes, '') <> '' THEN E'\n\n📝 <b>Shënime:</b> <i>' || NEW.notes || '</i>' ELSE '' END;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_apikey,
      'Authorization', 'Bearer ' || v_apikey,
      'x-internal-secret', v_secret
    ),
    body := jsonb_build_object(
      'text', v_text,
      'reply_markup', jsonb_build_object(
        'inline_keyboard', jsonb_build_array(
          jsonb_build_array(
            jsonb_build_object('text', '✅ Prano', 'callback_data', 'accept_order:' || NEW.id::text),
            jsonb_build_object('text', '🔍 Rishiko', 'callback_data', 'review_order:' || NEW.id::text)
          )
        )
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;