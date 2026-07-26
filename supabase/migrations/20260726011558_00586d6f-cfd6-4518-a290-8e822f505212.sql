
CREATE OR REPLACE FUNCTION public.close_pos_order(p_order_id uuid, p_operator_name text)
 RETURNS transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.pos_orders;
  v_txn public.transactions;
  v_txn_existed boolean := false;
  v_item jsonb;
  v_recipe RECORD;
  v_qty numeric;
BEGIN
  SELECT * INTO v_order FROM public.pos_orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Porosia nuk u gjet'; END IF;
  IF v_order.status = 'closed' THEN RAISE EXCEPTION 'Porosia është mbyllur tashmë'; END IF;

  SELECT * INTO v_txn FROM public.transactions
    WHERE order_id = p_order_id AND type = 'sale' LIMIT 1;

  IF v_txn.id IS NULL THEN
    INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
    VALUES (v_order.id, 'sale', v_order.total_amount, v_order.items, p_operator_name, v_order.location_id, v_order.table_number)
    RETURNING * INTO v_txn;
    v_txn_existed := false;
  ELSE
    UPDATE public.transactions SET operator_name = COALESCE(p_operator_name, operator_name)
      WHERE id = v_txn.id RETURNING * INTO v_txn;
    v_txn_existed := true;
  END IF;

  IF NOT v_txn_existed AND jsonb_typeof(v_order.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
    LOOP
      IF (v_item->>'productId') IS NOT NULL THEN
        v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
        IF v_qty > 0 THEN
          FOR v_recipe IN
            SELECT material_id, quantity_needed FROM public.recipes
            WHERE menu_item_id = (v_item->>'productId')::uuid
          LOOP
            IF COALESCE(v_recipe.quantity_needed, 0) > 0 THEN
              UPDATE public.raw_materials
                SET quantity = quantity - (v_recipe.quantity_needed * v_qty),
                    updated_at = now()
                WHERE id = v_recipe.material_id;
            END IF;
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.pos_orders
    SET status = 'closed', closed_at = NOW(), operator_name = p_operator_name
    WHERE id = p_order_id;

  IF v_order.table_id IS NOT NULL THEN
    UPDATE public.tables SET status = 'available' WHERE id = v_order.table_id;
  END IF;

  RETURN v_txn;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_pos_split(p_split_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_split_status text;
  v_all_confirmed boolean;
  v_order public.pos_orders;
  v_item jsonb;
  v_recipe RECORD;
BEGIN
  SELECT order_id, status INTO v_order_id, v_split_status
  FROM public.order_items_split
  WHERE id = p_split_id
  FOR UPDATE;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Split-i nuk u gjet' USING ERRCODE = 'P0002';
  END IF;

  IF v_split_status = 'confirmed' THEN
    RAISE EXCEPTION 'Ky split është konfirmuar tashmë' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.order_items_split
    SET status = 'confirmed', confirmed_at = now()
    WHERE id = p_split_id;

  SELECT bool_and(status = 'confirmed')
    INTO v_all_confirmed
    FROM public.order_items_split
    WHERE order_id = v_order_id;

  IF NOT COALESCE(v_all_confirmed, false) THEN
    RETURN jsonb_build_object('success', true, 'orderReady', false, 'orderId', v_order_id);
  END IF;

  SELECT * INTO v_order FROM public.pos_orders WHERE id = v_order_id FOR UPDATE;

  IF v_order.status <> 'closed' THEN
    UPDATE public.pos_orders SET status = 'ready' WHERE id = v_order_id AND status <> 'closed';
  END IF;

  BEGIN
    INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
    VALUES (v_order.id, 'sale', v_order.total_amount, v_order.items, v_order.operator_name, v_order.location_id, v_order.table_number);
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  IF jsonb_typeof(v_order.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
    LOOP
      IF (v_item->>'productId') IS NOT NULL THEN
        FOR v_recipe IN
          SELECT material_id, quantity_needed
          FROM public.recipes
          WHERE menu_item_id = (v_item->>'productId')::uuid
        LOOP
          IF COALESCE(v_recipe.quantity_needed, 0) * COALESCE((v_item->>'quantity')::numeric, 0) > 0 THEN
            UPDATE public.raw_materials
              SET quantity = quantity - (v_recipe.quantity_needed * (v_item->>'quantity')::numeric),
                  updated_at = now()
              WHERE id = v_recipe.material_id;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'orderReady', true, 'orderId', v_order_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_pos_split(p_split_id uuid, p_confirmed_by text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_split_status text;
  v_all_confirmed boolean;
  v_order public.pos_orders;
  v_item jsonb;
  v_recipe RECORD;
  v_operator text;
BEGIN
  SELECT order_id, status INTO v_order_id, v_split_status
  FROM public.order_items_split WHERE id = p_split_id FOR UPDATE;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Split-i nuk u gjet' USING ERRCODE = 'P0002';
  END IF;
  IF v_split_status = 'confirmed' THEN
    RAISE EXCEPTION 'Ky split është konfirmuar tashmë' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.order_items_split
    SET status='confirmed', confirmed_at=now(), confirmed_by=COALESCE(p_confirmed_by, confirmed_by)
    WHERE id = p_split_id;

  SELECT bool_and(status='confirmed') INTO v_all_confirmed
    FROM public.order_items_split WHERE order_id = v_order_id;

  IF NOT COALESCE(v_all_confirmed, false) THEN
    RETURN jsonb_build_object('success', true, 'orderReady', false, 'orderId', v_order_id);
  END IF;

  SELECT * INTO v_order FROM public.pos_orders WHERE id = v_order_id FOR UPDATE;
  IF v_order.status <> 'closed' THEN
    UPDATE public.pos_orders SET status='ready' WHERE id = v_order_id AND status <> 'closed';
  END IF;

  v_operator := COALESCE(p_confirmed_by, v_order.operator_name);

  BEGIN
    INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
    VALUES (v_order.id, 'sale', v_order.total_amount, v_order.items, v_operator, v_order.location_id, v_order.table_number);
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  IF jsonb_typeof(v_order.items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
    LOOP
      IF (v_item->>'productId') IS NOT NULL THEN
        FOR v_recipe IN
          SELECT material_id, quantity_needed FROM public.recipes
          WHERE menu_item_id = (v_item->>'productId')::uuid
        LOOP
          IF COALESCE(v_recipe.quantity_needed,0) * COALESCE((v_item->>'quantity')::numeric,0) > 0 THEN
            UPDATE public.raw_materials
              SET quantity = quantity - (v_recipe.quantity_needed * (v_item->>'quantity')::numeric),
                  updated_at = now()
              WHERE id = v_recipe.material_id;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  PERFORM public.apply_shiriti_delta(v_order.items, 1, now());

  RETURN jsonb_build_object('success', true, 'orderReady', true, 'orderId', v_order_id, 'confirmedBy', v_operator);
END;
$function$;
