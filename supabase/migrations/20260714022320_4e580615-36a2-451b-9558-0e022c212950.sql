
CREATE OR REPLACE FUNCTION public.confirm_pos_split(p_split_id uuid)
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
BEGIN
  -- Lock the split row
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

  -- Are all sibling splits confirmed now?
  SELECT bool_and(status = 'confirmed')
    INTO v_all_confirmed
    FROM public.order_items_split
    WHERE order_id = v_order_id;

  IF NOT COALESCE(v_all_confirmed, false) THEN
    RETURN jsonb_build_object('success', true, 'orderReady', false, 'orderId', v_order_id);
  END IF;

  -- Lock and load the order
  SELECT * INTO v_order FROM public.pos_orders WHERE id = v_order_id FOR UPDATE;

  IF v_order.status <> 'closed' THEN
    UPDATE public.pos_orders SET status = 'ready' WHERE id = v_order_id AND status <> 'closed';
  END IF;

  -- Register sale (idempotent via unique index on order_id+type=sale if present; ignore unique_violation)
  BEGIN
    INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
    VALUES (v_order.id, 'sale', v_order.total_amount, v_order.items, v_order.operator_name, v_order.location_id, v_order.table_number);
  EXCEPTION WHEN unique_violation THEN
    -- already recorded
    NULL;
  END;

  -- Decrement raw materials from recipes
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
              SET quantity = GREATEST(quantity - (v_recipe.quantity_needed * (v_item->>'quantity')::numeric), 0),
                  updated_at = now()
              WHERE id = v_recipe.material_id;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'orderReady', true, 'orderId', v_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_pos_split(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pos_split(uuid) TO service_role;
