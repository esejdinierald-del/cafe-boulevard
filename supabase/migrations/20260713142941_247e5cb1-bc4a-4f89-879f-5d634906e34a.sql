
CREATE OR REPLACE FUNCTION public.close_pos_order(p_order_id uuid, p_operator_name text)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.pos_orders;
  v_txn public.transactions;
BEGIN
  SELECT * INTO v_order FROM public.pos_orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Porosia nuk u gjet'; END IF;
  IF v_order.status = 'closed' THEN RAISE EXCEPTION 'Porosia është mbyllur tashmë'; END IF;

  -- Përdor transaksionin ekzistues (krijuar në konfirmim nga banaku); përndryshe krijoje.
  SELECT * INTO v_txn FROM public.transactions
    WHERE order_id = p_order_id AND type = 'sale' LIMIT 1;

  IF v_txn.id IS NULL THEN
    INSERT INTO public.transactions (order_id, type, amount, items, operator_name, location_id, table_number)
    VALUES (v_order.id, 'sale', v_order.total_amount, v_order.items, p_operator_name, v_order.location_id, v_order.table_number)
    RETURNING * INTO v_txn;
  ELSE
    UPDATE public.transactions SET operator_name = COALESCE(p_operator_name, operator_name)
      WHERE id = v_txn.id RETURNING * INTO v_txn;
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
