CREATE OR REPLACE FUNCTION public.apply_shiriti_delta(p_items jsonb, p_direction integer, p_at timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rome timestamp;
  v_hour int;
  v_date date;
  v_turn text;
  v_item jsonb;
  v_pid uuid;
  v_qty numeric;
  v_prod RECORD;
  v_units numeric;
  v_delta numeric;
  v_key text;
  v_existing jsonb;
  v_new_shiriti numeric;
  v_products jsonb;
  v_prev jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RETURN; END IF;

  v_rome := (p_at AT TIME ZONE 'Europe/Rome');
  v_hour := EXTRACT(HOUR FROM v_rome)::int;

  IF v_hour BETWEEN 6 AND 14 THEN
    v_date := v_rome::date; v_turn := 'turn1_data';
  ELSIF v_hour BETWEEN 15 AND 23 THEN
    v_date := v_rome::date; v_turn := 'turn2_data';
  ELSE
    v_date := (v_rome - INTERVAL '1 day')::date; v_turn := 'turn2_data';
  END IF;

  INSERT INTO public.inv_daily_entries (entry_date, turn1_data, turn2_data)
  VALUES (v_date, '{}'::jsonb, '{}'::jsonb)
  ON CONFLICT (entry_date) DO NOTHING;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_pid := NULLIF(v_item->>'productId','')::uuid;
    EXCEPTION WHEN OTHERS THEN v_pid := NULL;
    END;
    IF v_pid IS NULL THEN CONTINUE; END IF;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    IF v_qty = 0 THEN CONTINUE; END IF;

    FOR v_prod IN
      SELECT name, COALESCE(units_per_sale,1)::numeric AS ups
      FROM public.inv_products
      WHERE COALESCE(track_daily, true) = true
        AND v_pid = ANY(menu_item_ids)
    LOOP
      v_units := v_prod.ups;
      v_delta := v_qty * v_units * p_direction;
      v_key := v_prod.name;

      EXECUTE format('SELECT %I FROM public.inv_daily_entries WHERE entry_date=$1', v_turn)
      USING v_date INTO v_prev;
      v_products := COALESCE(v_prev, '{}'::jsonb);
      v_existing := COALESCE(v_products->v_key, jsonb_build_object('stokFillim',0,'furnizime',0,'gjendje',0,'shiriti',0));
      v_new_shiriti := COALESCE((v_existing->>'shiriti')::numeric, 0) + v_delta;
      IF v_new_shiriti < 0 THEN v_new_shiriti := 0; END IF;
      v_existing := jsonb_set(v_existing, '{shiriti}', to_jsonb(v_new_shiriti), true);
      v_products := jsonb_set(v_products, ARRAY[v_key], v_existing, true);

      EXECUTE format('UPDATE public.inv_daily_entries SET %I=$1, updated_at=now() WHERE entry_date=$2', v_turn)
      USING v_products, v_date;
    END LOOP;
  END LOOP;
END;
$function$;