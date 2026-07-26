# Missing Resources Report

Ky projekt është një **Remix**. Remix-i solli kodin (frontend + edge functions + migrations `.sql`) por **jo** burimet cloud të projektit origjinal (`boulevard-cafe.lovable.app`). Kjo tabelë tregon çfarë ekziston këtu vs. çfarë duhet rikrijuar.

Legjenda:
- ✅ **Ekziston në këtë projekt** — kodi/schema i vlefshëm gjendet në repo.
- ❌ **Mungon plotësisht** — as kod as të dhëna; duhet krijim manual.
- ⚠️ **Kërkon migrim manual** — kodi ekziston, por deployment/të dhënat jo.
- 🔒 **S'eksportohet automatikisht** — sekret/konfigurim që nuk mund të vijë me remix.

| Burimi | Status | Si të rikrijohet |
|---|---|---|
| **Supabase Project lidhja** | 🔒 | Ky projekt duhet lidhur me një **Lovable Cloud** të ri ose me një Supabase Project ekzistues. Në Lovable: `Settings → Cloud → Enable` (ose lidh Supabase). Rezultati: `.env` popullohet automatikisht me `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| **Database schema (tabelat + kolonat)** | ✅ | 84 migrations në `supabase/migrations/`. Aplikohen automatikisht kur lidhet Cloud, ose manualisht: `supabase db push` (CLI) ose një-nga-një nga Dashboard → SQL Editor sipas rendit alfabetik të emrit të file-it. |
| **RLS policies** | ✅ | Të përfshira brenda migrations. Verifiko pas aplikimit me `supabase db lint` ose Dashboard → Authentication → Policies. |
| **Database triggers** | ✅ | Të definuara brenda migrations (`handle_manager_signup`, `audit_row_change`, `create_fiscal_receipt`, `notify_push_on_*`, `notify_telegram_on_*`, `update_updated_at_column`, etj.). |
| **Database functions (RPC)** | ✅ | 14 RPC publike + funksione trigger. Aplikohen së bashku me migrations. |
| **Extensions (`pg_cron`, `pg_net`, `pgcrypto`, `supabase_vault`, `pg_graphql`, `pg_stat_statements`)** | ✅ | Migrations e aktivizojnë me `CREATE EXTENSION IF NOT EXISTS`. |
| **Realtime publications** (`service_requests`, `orders`, `pos_orders`, `tables`, `order_items_split`, `shift_tokens`) | ✅ | Migrations bëjnë `ALTER PUBLICATION supabase_realtime ADD TABLE ...`. |
| **Edge Functions (kodi)** | ✅ | 38 funksione nën `supabase/functions/`. |
| **Edge Functions (deploy)** | ⚠️ | Kur lidhet Lovable Cloud, deploy bëhet automatikisht. Ndryshe: `supabase functions deploy --project-ref <ref>` (një-nga-një ose të gjitha). |
| **Storage bucket `menu-images`** | ⚠️ | Bucket-i krijohet me migration (`20260321062752`) + policies (`20260405030440`). **PA imazhe** — imazhet e ngarkuara në projektin origjinal duhet të ri-ngarkohen manualisht ose të kopjohen me `supabase storage cp` nga projekti burim (nëse ke akses). |
| **Frontend Env Vars** (`VITE_SUPABASE_*`) | ⚠️ | Popullohen automatikisht nga lidhja Cloud. Nëse jo, plotësoji manualisht në `.env`. |
| **Edge Function Secrets** (`TELEGRAM_BOT_TOKEN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CLEANUP_SECRET`, `INTERNAL_WEBHOOK_SECRET`, `FOOTBALL_DATA_API_KEY`) | 🔒 | Nuk kalojnë me remix. Vendos përsëri te Supabase Dashboard → Edge Functions → Secrets (ose Lovable Cloud UI). Rigjenero VAPID me `npx web-push generate-vapid-keys`. Merr token të ri Telegram nga @BotFather ose refresh atë ekzistues. |
| **Auth Providers** (email/password, Google, etj.) | 🔒 | Konfigurimi bëhet te Supabase Dashboard → Authentication → Providers. Aktivizo Email + çdo provider social. Vendos redirect URLs: `https://<domain>/` dhe `https://<domain>/auth/callback` nëse përdoret. |
| **Auth Emails / SMTP** | 🔒 | Default e Supabase punon; për brand custom, konfiguro SMTP te Dashboard → Authentication → Email Templates. |
| **Manager accounts (`user_roles`)** | ❌ | Migrations krijojnë trigger `handle_manager_signup` që auto-assignon rol admin/manager për 3 email specifikë. Krijim përdoruesish të rinj: sign-up nga UI me ato email, ose insert manual te `user_roles`. |
| **Seed data** (menu items, tables, staff, raw materials, inv_products, categories) | ⚠️ | Disa seed janë të përfshira në migrations (p.sh. raw materials te `20260713122201`), por menu-ja, tavolinat dhe staf-i konkret **NUK janë**. Ri-krijoji nga UI e Manager Dashboard, ose eksporto/importo nga projekti burim me `pg_dump --data-only --table=public.<name>`. |
| **`app_settings` runtime keys** (`venue_qr_secret`, `telegram_chat_id`, blur toggle) | ❌ | Rifreskohen nga UI: `venue_qr_secret` te `/admin-tools`; Telegram te tab "Telegram" në Manager Dashboard; blur toggle te Inventari. |
| **Cron jobs (`pg_cron`)** | ⚠️ | Extension aktivizohet, por vetë jobs (p.sh. thirrja periodike e `cleanup-chat-sessions`) mund të mos jenë të shkruar në migrations. Kontrollo `SELECT * FROM cron.job;` pas migrimit; nëse s'ka job, konfiguroje manualisht ose përdor Supabase Dashboard → Database → Cron Jobs. |
| **Webhooks (Telegram)** | 🔒 | Vendos webhook-un me `POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=<edge>/telegram-webhook` — ose thirr action-in te `telegram-find-chat` që e bën automatikisht. |
| **Custom Domain** (`boulevard-caffe.lovable.app`, `cafe-boulevard.lovable.app`) | 🔒 | Konfigurohet nga Lovable → Settings → Domain. DNS records CNAME/A duhen te regjistruesi i domain-it. |
| **GitHub lidhja** | 🔒 | Lidhet nga Lovable → Settings → GitHub → Connect. Kërkon OAuth me llogarinë GitHub dhe zgjedhje repo-je (të re ose ekzistuese). |
| **Analytics** (Visitor analytics, custom events) | 🔒 | Aktivizohet nga Lovable Project Settings → Analytics. Të dhënat historike nuk transferohen. |
| **Publish settings** (badges, public remix, cross-project sharing) | 🔒 | Aktivizohen nga Lovable Project Settings → Publishing. |
| **Push subscribers** (`push_subscriptions` table data) | ⚠️ | Endpoint-et e vjetra janë të lidhur me VAPID-in e projektit të vjetër dhe janë të pavlefshëm me VAPID të ri. Tabela mund të krijohet bosh; klientët do të ri-subscribe automatikisht kur të lidhen. |
| **Print-station regjistrimi** | ⚠️ | Nuk ka të dhëna të ruajtura; PC-ja e printerit thjesht hap `/print-station` pas ri-lidhjes. |
| **Historik operacional** (`pos_orders`, `transactions`, `fiscal_receipts`, `audit_log`, `shift_turns`, `inv_daily_entries`) | ❌ | Nuk transferohen me remix. Nëse duhen, eksporto nga projekti burim: `pg_dump --data-only` për tabelat specifike, dhe importo në projektin e ri. Përndryshe, projekti fillon me histori bosh. |

---

## Prioriteti i rimëkëmbjes

1. Lidh Lovable Cloud → migrations aplikohen, edge functions deploy-ohen, `.env` popullohet.
2. Vendos secrets (Telegram, VAPID, INTERNAL_WEBHOOK_SECRET, CLEANUP_SECRET).
3. Konfiguro Auth providers + regjistro llogaritë manager.
4. Rifresko `venue_qr_secret` nga `/admin-tools`.
5. Rigjenero webhook Telegram.
6. Seed menu/tables/staff nga UI ose pg_dump.
7. Konfiguro domain-in dhe GitHub sipas dëshirës.

Për hapa të hollësishëm shih `RESTORE_GUIDE.md`.