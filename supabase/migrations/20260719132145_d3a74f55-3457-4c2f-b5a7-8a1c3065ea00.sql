
CREATE OR REPLACE FUNCTION public.void_pos_item(p_order_id uuid, p_product_id uuid, p_qty numeric, p_price numeric, p_operator text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recipe RECORD;
  v_order public.pos_orders;
  v_items jsonb;
  v_created timestamptz;
  v_rome timestamp;
  v_hour int;
  v_date date;
  v_seq int;
  v_locked boolean;
BEGIN
  IF p_qty <= 0 OR p_product_id IS NULL THEN RETURN; END IF;

  SELECT * INTO v_order FROM public.pos_orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Porosia nuk u gjet';
  END IF;

  -- Compute original turn (T1/T2) from order created_at in Europe/Rome
  v_created := COALESCE(v_order.created_at, now());
  v_rome := (v_created AT TIME ZONE 'Europe/Rome');
  v_hour := EXTRACT(HOUR FROM v_rome)::int;
  IF v_hour BETWEEN 6 AND 14 THEN
    v_date := v_rome::date; v_seq := 1;
  ELSIF v_hour BETWEEN 15 AND 23 THEN
    v_date := v_rome::date; v_seq := 2;
  ELSE
    v_date := (v_rome - INTERVAL '1 day')::date; v_seq := 2;
  END IF;

  -- Block cancellation if the original shift turn is locked
  SELECT bool_or(is_locked) INTO v_locked
    FROM public.shift_turns
    WHERE entry_date = v_date AND sequence_number = v_seq;

  IF COALESCE(v_locked, false) THEN
    RAISE EXCEPTION 'Turni origjinal (% T%) është i mbyllur — anullimi nuk lejohet', v_date, v_seq
      USING ERRCODE = 'P0001';
  END IF;

  -- Restore raw materials
  FOR v_recipe IN
    SELECT material_id, quantity_needed FROM public.recipes WHERE menu_item_id = p_product_id
  LOOP
    IF COALESCE(v_recipe.quantity_needed,0) > 0 THEN
      UPDATE public.raw_materials
        SET quantity = quantity + (v_recipe.quantity_needed * p_qty), updated_at = now()
        WHERE id = v_recipe.material_id;
    END IF;
  END LOOP;

  -- Shiriti - applied to the ORIGINAL turn (using order's created_at)
  v_items := jsonb_build_array(jsonb_build_object('productId', p_product_id::text, 'quantity', p_qty));
  PERFORM public.apply_shiriti_delta(v_items, -1, v_created);

  -- Void transaction (negative amount) — actual reversal time = now()
  INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
  VALUES (
    p_order_id, 'void', -1 * (COALESCE(p_price,0) * p_qty),
    jsonb_build_array(jsonb_build_object('productId', p_product_id::text, 'quantity', p_qty, 'price', p_price, 'cancelled', true)),
    p_operator, v_order.location_id, v_order.table_number
  );
END;
$function$;

-- Helper: check if an order's original turn is locked
CREATE OR REPLACE FUNCTION public.is_order_turn_locked(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_created timestamptz;
  v_rome timestamp;
  v_hour int;
  v_date date;
  v_seq int;
  v_locked boolean;
BEGIN
  SELECT created_at INTO v_created FROM public.pos_orders WHERE id = p_order_id;
  IF v_created IS NULL THEN RETURN false; END IF;
  v_rome := (v_created AT TIME ZONE 'Europe/Rome');
  v_hour := EXTRACT(HOUR FROM v_rome)::int;
  IF v_hour BETWEEN 6 AND 14 THEN
    v_date := v_rome::date; v_seq := 1;
  ELSIF v_hour BETWEEN 15 AND 23 THEN
    v_date := v_rome::date; v_seq := 2;
  ELSE
    v_date := (v_rome - INTERVAL '1 day')::date; v_seq := 2;
  END IF;
  SELECT bool_or(is_locked) INTO v_locked
    FROM public.shift_turns
    WHERE entry_date = v_date AND sequence_number = v_seq;
  RETURN COALESCE(v_locked, false);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.is_order_turn_locked(uuid) TO authenticated, service_role;
