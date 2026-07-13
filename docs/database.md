# Database Schema

## Tabelat kryesore
- `pos_orders` — porositë (open/confirmed/closed), source, operator_name.
- `transactions` — shitjet (sale/void/refund), amount, items.
- `raw_materials` — quantity, unit, min_threshold, is_critical.
- `recipes` — menu_item_id → material_id (quantity_per_unit).
- `shift_turns` — SoT për regjistrim ditor.
- `supplier_orders` — porosi drejtuar furnitorëve (draft/sent/received/cancelled).
- `product_costs` — kosto historike blerjeje.
- `audit_log` / `app_logs` — logje të pandryshueshme.

## Funksione
- `has_role(uid, role)` SECURITY DEFINER
- `close_pos_order`, `add_supply`, `decrement_material`, `increment_material`
- `verify_staff_pin`, `audit_row_change`

## Grants
- authenticated: sipas politikave
- service_role: gjithçka
- anon: vetëm publike (menu, kategori, tavolina)
