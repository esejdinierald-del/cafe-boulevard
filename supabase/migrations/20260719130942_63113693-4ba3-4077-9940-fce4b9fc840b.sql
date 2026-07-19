
-- 1. confirmed_by column
ALTER TABLE public.order_items_split ADD COLUMN IF NOT EXISTS confirmed_by text;

-- 2. Helper: apply sale delta to inv_daily_entries shirit for Rome-local turn at "at" moment
CREATE OR REPLACE FUNCTION public.apply_shiriti_delta(p_items jsonb, p_direction int, p_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rome timestamp;
  v_hour int;
  v_date date;
  v_turn text; -- 'turn1_data' or 'turn2_data'
  v_col text;
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

  -- T1 = 06:00 - 14:59 (same day)
  -- T2 = 15:00 - 23:59 (same day)
  -- 00:00 - 05:59 -> T2 previous day
  IF v_hour BETWEEN 6 AND 14 THEN
    v_date := v_rome::date;
    v_turn := 'turn1_data';
  ELSIF v_hour BETWEEN 15 AND 23 THEN
    v_date := v_rome::date;
    v_turn := 'turn2_data';
  ELSE
    v_date := (v_rome - INTERVAL '1 day')::date;
    v_turn := 'turn2_data';
  END IF;

  -- Ensure row exists
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

    -- Find every inv_product that maps this menu_item_id
    FOR v_prod IN
      SELECT name, COALESCE(units_per_sale,1)::numeric AS ups
      FROM public.inv_products
      WHERE COALESCE(track_daily, true) = true
        AND v_pid::text = ANY(menu_item_ids)
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
$$;

-- 3. Rewrite confirm_pos_split to accept confirmedBy and apply shiriti
CREATE OR REPLACE FUNCTION public.confirm_pos_split(p_split_id uuid, p_confirmed_by text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Decrement raw materials via recipes
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
              SET quantity = GREATEST(quantity - (v_recipe.quantity_needed * (v_item->>'quantity')::numeric), 0),
                  updated_at = now()
              WHERE id = v_recipe.material_id;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- Apply shiriti +
  PERFORM public.apply_shiriti_delta(v_order.items, 1, now());

  RETURN jsonb_build_object('success', true, 'orderReady', true, 'orderId', v_order_id, 'confirmedBy', v_operator);
END;
$$;

-- 4. Void handler for cancellations: restores raw_materials, decrements shiriti, records void txn
CREATE OR REPLACE FUNCTION public.void_pos_item(
  p_order_id uuid,
  p_product_id uuid,
  p_qty numeric,
  p_price numeric,
  p_operator text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe RECORD;
  v_order public.pos_orders;
  v_items jsonb;
BEGIN
  IF p_qty <= 0 OR p_product_id IS NULL THEN RETURN; END IF;

  SELECT * INTO v_order FROM public.pos_orders WHERE id = p_order_id;

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

  -- Shiriti -
  v_items := jsonb_build_array(jsonb_build_object('productId', p_product_id::text, 'quantity', p_qty));
  PERFORM public.apply_shiriti_delta(v_items, -1, now());

  -- Void transaction (negative amount)
  INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
  VALUES (
    p_order_id, 'void', -1 * (COALESCE(p_price,0) * p_qty),
    jsonb_build_array(jsonb_build_object('productId', p_product_id::text, 'quantity', p_qty, 'price', p_price, 'cancelled', true)),
    p_operator, v_order.location_id, v_order.table_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_shiriti_delta(jsonb, int, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_pos_item(uuid, uuid, numeric, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_pos_split(uuid, text) TO service_role;
