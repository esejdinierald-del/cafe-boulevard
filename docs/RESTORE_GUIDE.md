# Restore Guide

Udhëzim hap-pas-hapi për ta rikthyer këtë projekt të remrixuar në gjendje pune të plotë. Nga zero deri në produksion.

---

## Hapi 1 — Lidh backend-in

### Opsioni A (i rekomanduar): Lovable Cloud

1. Në Lovable → `Settings → Cloud → Enable Cloud`.
2. Prit që projekti të provizionohet. Rezultatet:
   - `.env` popullohet automatikisht me `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
   - Migrations aplikohen automatikisht.
   - Edge Functions deploy-ohen automatikisht.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` janë të mbushura automatikisht.

### Opsioni B: Supabase Project ekzistues (jashtë Lovable)

1. Krijo/zgjidh një projekt te https://supabase.com.
2. Kopjo në `.env`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
   VITE_SUPABASE_PROJECT_ID=<ref>
   ```
3. Instalo Supabase CLI: `npm i -g supabase`.
4. Login + link: `supabase login && supabase link --project-ref <ref>`.

---

## Hapi 2 — Aplikimi i migrations

### Automatik (Lovable Cloud)
Migrations aplikohen vetvetiu. Verifiko te Dashboard → Database → Tables se ekzistojnë të gjitha tabelat e listuara në `PROJECT_INVENTORY.md`.

### Manual (Supabase CLI)
```bash
supabase db push
```
Kjo aplikon çdo file `.sql` nga `supabase/migrations/` sipas rendit të timestamp-it.

### Fallback: SQL Editor
Nëse `db push` dështon (p.sh. konflikt me schema ekzistuese):
1. Renditi file-t: `ls supabase/migrations/ | sort`.
2. Për secilin: hap Dashboard → SQL Editor → paste përmbajtjen → Run.
3. Skip file-t që dështojnë me `already exists` (të padëmshëm).

### Verifikim
```sql
-- 30 tabela publike të pritshme
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';

-- 14 RPC publike të pritshme
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema='public' AND routine_type='FUNCTION'
 ORDER BY routine_name;
```

---

## Hapi 3 — Deploy Edge Functions

### Automatik (Lovable Cloud)
U deploy vetvetiu.

### Manual (Supabase CLI)
```bash
# Të gjitha njëherësh
for fn in supabase/functions/*/; do
  name=$(basename "$fn")
  [ "$name" = "_shared" ] && continue
  supabase functions deploy "$name" --project-ref <ref>
done
```

`supabase/config.toml` përmban `[functions.telegram-webhook] verify_jwt = false` — kjo respektohet automatikisht.

---

## Hapi 4 — Storage buckets

### Krijim
Migration `20260321062752_*.sql` insert-on bucket-in `menu-images` te `storage.buckets` dhe migration `20260405030440_*.sql` vendos policies. Verifiko te Dashboard → Storage se bucket-i ekziston dhe është **public**.

Nëse nuk ekziston:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT DO NOTHING;
```

### Policies (Dashboard → Storage → menu-images → Policies)
- `SELECT` për `public` ku `bucket_id = 'menu-images'`.
- `INSERT` / `UPDATE` / `DELETE` për `authenticated` ku `bucket_id = 'menu-images'`.

### Migrim i imazheve (opsional)
Nëse ke akses te projekti burim:
```bash
# Nga projekti i vjetër
supabase storage cp --recursive ss:menu-images/ ./menu-images-backup/

# Në projektin e ri
supabase storage cp --recursive ./menu-images-backup/ ss:menu-images/
```
Përndryshe imazhet duhet ri-ngarkuar nga UI e Manager Dashboard.

---

## Hapi 5 — Konfiguro Secrets për Edge Functions

Te Supabase Dashboard → Edge Functions → Secrets (ose Lovable Cloud → Secrets):

| Secret | Vlera |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Nga @BotFather (`/newbot` ose `/token`). |
| `VAPID_PUBLIC_KEY` | Nga `npx web-push generate-vapid-keys` (public). |
| `VAPID_PRIVATE_KEY` | Nga i njëjti komandë (private). |
| `CLEANUP_SECRET` | String i rastësishëm ≥ 32 chars (`openssl rand -hex 32`). |
| `INTERNAL_WEBHOOK_SECRET` | String i rastësishëm ≥ 32 chars. **Duhet të përputhet** me vlerën e hard-code-uar te DB triggers `notify_push_on_*` dhe `notify_telegram_on_*`. Nëse ndryshon, përditëso edhe funksionet trigger në DB. |
| `FOOTBALL_DATA_API_KEY` | Opcional, vetëm nëse aktivizohet feature-i. |

> Sistem secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`) janë auto-set.

---

## Hapi 6 — Auth Providers

Te Dashboard → Authentication → Providers:

1. **Email** — aktivizo. Për development, mund të çaktivizosh "Confirm email".
2. **Google** (opcional) — aktivizo, vendos `Client ID` / `Client Secret` nga Google Cloud Console. Redirect URL: `https://<ref>.supabase.co/auth/v1/callback`.
3. Te `Authentication → URL Configuration`:
   - Site URL: `https://<domain-tënd>`
   - Redirect URLs: shto çdo domain që përdor për test/prod.

### Krijim i llogarive Manager
Trigger-i `handle_manager_signup` (te `20260204*.sql`) auto-assignon `admin`+`manager` për email-et:
- `menuonline483@gmail.com`
- `sejdinierald@gmail.com`
- `e.sejdini.erald@gmail.com`

Për t'i ndryshuar këto: edito funksionin dhe re-migro. Për email të tjerë, insert manual:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<uuid-i-përdoruesit>', 'admin');
```

---

## Hapi 7 — Konfigurime runtime

### 7a. Venue QR secret
1. Regjistrohu si manager, hyr te `/manager-dashboard`.
2. Shko te `/admin-tools`.
3. Kliko "Gjenero secret të ri" — kjo update-on `app_settings.venue_qr_secret`.
4. Ky secret duhet të ndodhet në URL të QR-it fizik të lokalit: `https://<domain>/staff-app?qr=<secret>`.

### 7b. Telegram bot
1. Te Manager Dashboard → tab "Telegram" → "Konfiguro webhook" (thirr `telegram-find-chat` me action `set_webhook`).
2. Për njoftime targetuar staf-i, bëj që çdo staf t'i dërgojë bot-it kontaktin e tij; webhook-u lidh automatikisht `phone → telegram_chat_id`.

### 7c. Cron jobs (opsional)
```sql
-- Shembull: pastro chat_sessions çdo natë
SELECT cron.schedule(
  'cleanup-chat-daily',
  '0 3 * * *',
  $$ SELECT net.http_post(
       url := 'https://<ref>.supabase.co/functions/v1/cleanup-chat-sessions',
       headers := jsonb_build_object('x-cleanup-secret', '<vlera-cleanup-secret>')
     ); $$
);
```

---

## Hapi 8 — Lidhja me GitHub

1. Në Lovable → `Settings → GitHub → Connect`.
2. Autorizo aplikacionin.
3. Zgjidh: krijo repo të re **ose** lidhu me repo ekzistues.
4. Push i parë ndodh automatikisht. Pas kësaj, çdo ndryshim në Lovable sinkronizohet me GitHub dhe anasjelltas.

---

## Hapi 9 — Custom Domain (opsional)

1. Lovable → `Settings → Domain → Add custom domain`.
2. Ndiq udhëzimet DNS (CNAME te `cname.lovable.app` ose të ngjashme).
3. Prit propagimin (deri 24h).
4. Përditëso Supabase `Site URL` te lloji i ri.

---

## Hapi 10 — Verifikimi funksional

Kontrollo këto flow-e para se ta shpallësh live:

- [ ] `/menu` hapet, tavolina identifikohet përmes QR public.
- [ ] Klient bën një porosi test → njoftim mbërrin te Dashboard + Telegram + Push.
- [ ] Staf skanon `/staff-app?qr=<secret>` → shift token krijohet.
- [ ] POS (`/pos`) hapet, krijohet një porosi, konfirmohet nga banaku → transaction shënohet, `raw_materials` zbritet.
- [ ] Manager Dashboard → tab "Stafi" krijon një staf të ri me PIN.
- [ ] `/regjistrimi-ditor` hap turn-in aktual, mbush stok fillim/gjendje.
- [ ] Print-station (`/print-station`) merr punët e printimit.
- [ ] `/admin-tools` mund të rotate `venue_qr_secret`.

Nëse ndonjë hap dështon, kontrollo:
- `Edge Function Logs` te Dashboard.
- `Postgres Logs` për RLS denials.
- Console e browserit për errors të lidhur me env vars.

---

## Shënime të rëndësishme

- **Të dhënat historike nuk transferohen automatikisht.** Nëse ke nevojë për historikun operacional (transaksione, fatura, audit log), duhet `pg_dump --data-only --table=public.<name>` nga projekti burim dhe `psql < backup.sql` në projektin e ri. Sigurohu që schema të jetë identike para se të bësh import.
- **Sekretet nuk vijnë kurrë me remix.** Të gjithë duhet ri-krijuar/rotate.
- **VAPID i ri = subscribers të vjetër të pavlefshëm.** Kjo është normale; klientët do të ri-subscribe në ngarkimin e parë të faqes.
- **`INTERNAL_WEBHOOK_SECRET`** ka një vlerë të hard-code-uar brenda funksioneve trigger `notify_push_on_*` dhe `notify_telegram_on_*` në DB. Nëse e ndryshon, duhet të përditësosh edhe atë vlerë brenda funksioneve (edit + re-migrate), përndryshe trigger-at nuk do të autorizohen te edge functions.