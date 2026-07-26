# Project Inventory

Inventar i të gjitha burimeve që gjenden **realisht në këtë repo**. Çdo gjë që s'ndodhet këtu (auth providers, vlera secrets, DNS, GitHub) nuk mund të nxirret nga kodi dhe kërkon konfigurim manual — shiko `MISSING_RESOURCES_REPORT.md`.

> Burimi i së vërtetës për këtë listë: `src/integrations/supabase/types.ts`, `supabase/migrations/*.sql`, `supabase/functions/**`, `supabase/config.toml`, grep në `src/`.

---

## 1. Tabelat e Databazës (`public` schema)

Të gjitha kolonat/tipat janë të gjeneruara në `src/integrations/supabase/types.ts` — konsulto atë skedar për sinjaturat e sakta të Row/Insert/Update. Më poshtë jepet emri dhe qëllimi.

| Tabela | Qëllimi |
|---|---|
| `ai_knowledge` | Njohuri që feed AI-në në `staff-chat`. |
| `app_logs` | Log operativ i aplikacionit (event/severity/actor/metadata). |
| `app_settings` | Key/value për config-e në runtime (p.sh. `venue_qr_secret`, `telegram_chat_id`). |
| `audit_log` | Log i pandryshueshëm i ndryshimeve në tabelat sensitive. |
| `categories` | Kategori menu-je (group_name, for_bar, for_kitchen, enabled, track_daily). |
| `chat_sessions` | Sesionet AI-chat për klientët. |
| `feedback` | Vlerësim 1–5 nga klientët. |
| `fiscal_receipts` | Fatura fiskale (fiscal_number, VAT, net, items). |
| `inv_daily_entries` | Regjistrimi ditor (turn1_data/turn2_data JSONB). |
| `inv_next_day_stock` | Stok fillues për ditën pasardhëse. |
| `inv_products` | Produkte të "Regjistrimi Ditor" (units_per_sale, track_daily, menu_item_ids). |
| `menu_items` | Artikuj menu-je (price, offer_price/window, display_order, for_bar/kitchen). |
| `order_items_split` | Ndarja bar/kuzhinë e një porosie POS për KDS. |
| `orders` | Porositë klient (nga /menu, para se t'i pranohen). |
| `playlist_state` | Gjendja e playlist-it të dhomës. |
| `pos_orders` | Porositë POS (status, mode, source, table, total_amount, items JSONB). |
| `print_jobs` | Rradha e printimit për print-station. |
| `product_costs` | Historiku i kostove të blerjes. |
| `push_subscriptions` | Endpoint-et Web Push (shift_token për targetim). |
| `raw_materials` | Inventari (quantity, unit, min_threshold, is_critical). |
| `recipes` | Lidhja menu_item → material (quantity_needed). |
| `service_requests` | Thirrjet e shërbimit nga tavolinat. |
| `shift_tokens` | Token-i i sesionit të turnit (unlocked, shift_start/end). |
| `shift_turns` | Turni i regjistrimit ditor (entry_date, sequence_number, is_locked). |
| `song_requests` | Kërkesat për këngë. |
| `staff_members` | Stafi (pin_hash, admin_password_hash, phone, telegram_chat_id, active_shift_token, is_admin). |
| `supplier_orders` | Porosi drejtuar furnitorëve. |
| `supplies` | Furnizimet e regjistruara që rrisin `raw_materials.quantity`. |
| `tables` | Tavolinat (number, name, qr_code, status, locked_by_name/color). |
| `transactions` | Shitjet/refunds/void të lidhura me `pos_orders`. |
| `user_roles` | Rolet e app-it (app_role enum) të ndarë nga profile. |

**Foreign keys** të deklaruara në types.ts (shembujt kryesorë):

- `categories.parent_id → categories.id`

Pjesa më e madhe e lidhjeve në këtë projekt bëhet me UUID-e por pa constraint formal FK në DB — konfirmohet nga `Relationships: []` në types.ts. Kryesoret që ekzistojnë vetëm logjikisht:

- `pos_orders.table_id → tables.id`
- `order_items_split.order_id → pos_orders.id`
- `transactions.order_id → pos_orders.id`
- `recipes.menu_item_id → menu_items.id`, `recipes.material_id → raw_materials.id`
- `menu_items.category_id → categories.id`
- `supplies.material_id → raw_materials.id`
- `user_roles.user_id → auth.users.id`
- `staff_members.active_shift_token → shift_tokens.token`

---

## 2. Enum-et

| Enum | Vlerat |
|---|---|
| `app_role` | `admin`, `manager`, `user` |

---

## 3. RPC / Database Functions (të ekspozuara në PostgREST)

Nga `types.ts → Functions:` (14 total). Për SQL të plotë shih `supabase/migrations/*.sql` dhe seksionin `db-functions` në kodin backend.

| Funksion | Argumentet | Return |
|---|---|---|
| `add_supply` | `p_material_id uuid, p_quantity numeric, p_note text, p_operator_name text, p_location_id uuid` | `raw_materials` row |
| `admin_reopen_shift_turn` | `p_turn_id uuid` | `shift_turns` row |
| `apply_shiriti_delta` | `p_items jsonb, p_direction int, p_at timestamptz` | void — përditëson `inv_daily_entries.shiriti` |
| `close_pos_order` | `p_order_id uuid, p_operator_name text` | `transactions` row |
| `decrement_material` | `material_id uuid, amount numeric` | void |
| `increment_material` | `material_id uuid, amount numeric` | void |
| `has_role` | `_user_id uuid, _role app_role` | boolean |
| `set_staff_pin` | `p_id uuid, p_pin text` | void (bcrypt hash) |
| `set_staff_admin_password` | `p_id uuid, p_password text` | void (bcrypt hash) |
| `verify_staff_pin` | `p_pin text` | table(id, name, role, location_id) |
| `verify_staff_pin_by_name` | `p_name text, p_pin text` | table(id, name, role, is_admin) |
| `verify_staff_admin_password` | `p_staff_id uuid, p_password text` | table(id, name, role) |
| `verify_staff_admin_password_by_name` | `p_name text, p_password text` | table(id, name, role) |
| `void_pos_item` | `p_order_id uuid, p_product_id uuid, p_qty numeric, p_price numeric, p_operator text` | void |

Shënim sigurie: `void_pos_item`, `apply_shiriti_delta`, dhe `confirm_pos_split` (jo në types.ts sepse janë REVOKED nga PUBLIC) nuk mund të thirren nga `anon`/`authenticated` direkt — vetëm nga edge functions me `service_role`.

Funksione DB të tjera që ekzistojnë por s'janë të ekspozuara si RPC (trigger/internal):
- `handle_manager_signup`, `update_updated_at_column`, `inv_handle_updated_at`
- `audit_row_change`, `create_fiscal_receipt`
- `confirm_pos_split(uuid)` dhe `confirm_pos_split(uuid, text)`
- `is_order_turn_locked`
- `notify_push_on_new_order`, `notify_push_on_service_request`
- `notify_telegram_on_new_order`, `notify_telegram_on_service_request`

---

## 4. Migrations

Në `supabase/migrations/` gjenden **84 file .sql**. Baseline është `20251206001705_remix_migration_from_pg_dump.sql` (schema fillestare e re-mixuar nga pg_dump — 457 rreshta, përfshin ekstensione, tabela bazë, dhe RLS). Migrations pasuese janë inkrementale.

Përmbledhje temash kryesore sipas kohës:

- `20251206`: baseline — extensions (`pgcrypto`, `pg_graphql`, `pg_stat_statements`, `supabase_vault`), tabelat bazë.
- `20260128`: realtime publication për `service_requests`, `orders`.
- `20260204`: `handle_manager_signup()` trigger për auto-role në auth.users.
- `20260308`: `chat_sessions`, `shift_tokens`.
- `20260314…20260321`: forcim RLS për `orders`, `service_requests`, `shift_tokens`, `chat_sessions`.
- `20260321060442`: aktivizim `pg_cron` + `pg_net` në schema `extensions`.
- `20260321070936`: shto `offer_price/start/end` te `menu_items`.
- `20260321222516`: `feedback` table + RLS.
- `20260325`: realtime për `shift_tokens`; shto `kitchen_ready` te `service_requests`.
- `20260404`: `menu_items.display_order`.
- `20260405010635`: trigger `on_manager_signup` në auth.users.
- `20260405030440`: forcim final RLS për `shift_tokens` + storage policies për `menu-images`.
- `20260407`: `push_subscriptions`.
- `20260508`: `categories.group_name`.
- `20260625`: `song_requests`, `playlist_state`, `tables`.
- `20260707044742`: **POS system migration** (pos_orders, order_items_split, transactions, GRANTs).
- `20260707051823`: hiq policy `allow_all` nga tabelat POS.
- `20260708003808`: `recipes`.
- `20260708014302`: `staff_members` me `pin_hash`.
- `20260708022523`: realtime për tabelat POS.
- `20260708034459`: `print_jobs`.
- `20260708162809`: `inv_products`, `inv_daily_entries`.
- `20260712`: `shift_turns`.
- `20260713122201`: seed raw materials.
- `20260713142941`: `close_pos_order()`.
- `20260713150329`: audit log + DELETE lockdown + `pos_orders.source`.
- `20260713150814…152815`: forcim RLS inv_*, bcrypt PIN + admin password RPCs.
- `20260713170544`: `void_pos_item()`.
- `20260713201832…215*`: patches të vogla RLS/roles.
- `20260714*`: `supplies`, `product_costs`, `supplier_orders`, `fiscal_receipts` + trigger, `apply_shiriti_delta`.
- `20260715*`: `staff_members.phone/telegram_chat_id`, notify triggers Telegram + Web Push.
- `20260716*`: `inv_next_day_stock`.
- `20260717*`: patches të vogla RLS.
- `20260718*`: `staff_members.active_shift_token` + targetim njoftimesh.
- `20260719*`: hardening RLS masiv (SECURITY DEFINER hardening, REVOKE nga PUBLIC te void/shiriti/split).
- `20260720`: patch minor.
- `20260726*`: `venue_qr_secret` arkitekturë + `is_order_turn_locked()` + REVOKE final.

> Për diff të plotë të secilit file: `git log --diff-filter=A -- supabase/migrations/`.

---

## 5. Edge Functions

Të gjitha nën `supabase/functions/`. 38 funksione. `supabase/config.toml` konfiguron vetëm `[functions.telegram-webhook] verify_jwt = false` — të tjerat përdorin JWT-in default të Supabase.

| Funksion | Qëllimi (nga kodi) |
|---|---|
| `admin-read` | Read-only DB endpoint pas verifikimit admin. |
| `admin-reopen-turn` | Rihap një `shift_turns` të mbyllur. |
| `cleanup-chat-sessions` | Cron/manual: fshin `chat_sessions` > 24h me `x-cleanup-secret`. |
| `close-shift` | Mbyll një shift token dhe pastron `active_shift_token`. |
| `complete-request` | Shënon `service_requests` si të plotësuar. |
| `get-chat-session` | Merr sesion AI-chat me service role (kufizim 10 min). |
| `get-table-name` | Kthen emrin e tavolinës për QR public. |
| `list-orders` | Listë porosish për dashboard me `x-shift-token`. |
| `list-staff-names` | Public: emrat aktivë të stafit (pa PIN). |
| `manage-admin-passcode` | CRUD passcode admin (legacy). |
| `manage-inv-product` | CRUD `inv_products`. |
| `manage-playlist` | Kontroll i playlist_state. |
| `manage-shift` | Menaxhim i `shift_tokens` (create, admin_bypass, qr_secret, complete_order). |
| `manage-shift-turn` | Menaxhim i `shift_turns`. |
| `manage-songs` | CRUD `song_requests` (incl. `clear_queue`). |
| `manage-staff` | CRUD `staff_members` (require manager role). |
| `mcp` | MCP endpoint për tool-e të LLM-it. |
| `notify-telegram` | Dërgon mesazhe Telegram me `TELEGRAM_BOT_TOKEN`. |
| `pos-cancel-item` | Anullim item me admin password + block turn i mbyllur. |
| `pos-confirm-order` | Konfirmim porosie nga bar/kuzhinë. |
| `pos-create-order` | Krijim porosie POS (me shift token + rate limit). |
| `pos-get-inventory` | Read stok POS. |
| `pos-print-ticket` | Vendos punët e printimit në `print_jobs`. |
| `print-station` | Endpoint për print-station që tërheq punë. |
| `purge-transactions` | Admin: fshin/purge transactions. |
| `push-subscribe` | Ruaj push subscription për shift-in. |
| `scan-mulliri` | AI Vision OCR i njehsorit të mulliri (kërkon shift token). |
| `send-push` | Dërgon Web Push me VAPID te subscribers me shift aktiv. |
| `set-inventory-blur` | Admin toggle për "blur" në kolonat sasi/min. |
| `staff-chat` | AI-chat për stafin (Lovable AI Gateway). |
| `staff-read` | Read i mbrojtur me shift token. |
| `telegram-find-chat` | Utilities Telegram (find chat_id, set webhook, set bot profile). |
| `telegram-webhook` | Webhook Telegram (pa JWT) — callbacks + contact linking. |
| `unlock-shift` | Ndez `shift_tokens.unlocked = true`. |
| `update-order-status` | Prano/Refuzo porosi klient, krijo POS order. |
| `validate-shift` | Verifikon një shift token të skanuar. |
| `verify-admin-passcode` | Verifikim passcode global (legacy). |
| `verify-staff-admin` | Verifikon admin_password për një staf. |
| `verify-staff-pin` | Verifikon PIN staf-i (rate-limited). |

Modul i përbashkët në `supabase/functions/_shared/`: `cors.ts`, `hash.ts`, `rate-limit.ts`, `verify-admin.ts`, `verify-shift-token.ts`.

---

## 6. Storage Buckets

| Bucket | Public | Përdoret te | Krijuar te |
|---|---|---|---|
| `menu-images` | ✅ Po | `src/pages/ManagerDashboard.tsx` (upload + getPublicUrl) | `supabase/migrations/20260321062752_*.sql` (policies te `20260405030440_*.sql`) |

Nuk u gjet asnjë referencë tjetër `supabase.storage.from(...)` në kod.

---

## 7. Environment Variables

### 7.1 Frontend (Vite — `import.meta.env.*`)

| Variable | Përdoret te |
|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PROJECT_ID` | `src/integrations/supabase/client.ts` (kontekst) |

### 7.2 Edge Functions (`Deno.env.get(...)`)

| Variable | Nga sistemi apo user? | Përdoret te (mostër) |
|---|---|---|
| `SUPABASE_URL` | auto (system) | pothuajse çdo funksion |
| `SUPABASE_ANON_KEY` | auto (system) | `manage-staff`, `list-orders` |
| `SUPABASE_SERVICE_ROLE_KEY` | auto (system) | pothuajse çdo funksion |
| `LOVABLE_API_KEY` | auto (Lovable AI Gateway) | `staff-chat`, `scan-mulliri` |
| `TELEGRAM_BOT_TOKEN` | user | `notify-telegram`, `telegram-*` |
| `VAPID_PUBLIC_KEY` | user | `send-push`, `push-subscribe` |
| `VAPID_PRIVATE_KEY` | user | `send-push` |
| `CLEANUP_SECRET` | user (self-generated) | `cleanup-chat-sessions` |
| `INTERNAL_WEBHOOK_SECRET` | user (self-generated) | notify triggers → `send-push`/`notify-telegram` |
| `FOOTBALL_DATA_API_KEY` | user (opcional) | një feature opcional (grep te `supabase/functions/`) |

---

## 8. Realtime Publications

Nga migrations, `supabase_realtime` përmban të paktën:
`service_requests`, `orders`, `shift_tokens`, `pos_orders`, `tables`, `order_items_split`.

---

## 9. Extensions të aktivizuara

Nga baseline + migrations: `pgcrypto`, `pg_graphql`, `pg_stat_statements`, `plpgsql`, `supabase_vault`, `pg_cron`, `pg_net`.