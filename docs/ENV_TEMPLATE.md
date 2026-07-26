# Environment Template

Ky projekt përdor dy nivele env-variablash: **frontend** (Vite, prefiks `VITE_`) dhe **edge functions** (Supabase Secrets). Kjo faqe përshkruan të dyja pa vendosur asnjë vlerë reale.

---

## Frontend (`.env`)

Kopjo `.env.example` në `.env` në root të projektit dhe plotëso vlerat. Këto lexohen në build-time nga Vite.

| Variable | Përdoret te | Përshkrim | Ku merret |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` | URL bazë e projektit Supabase (`https://<ref>.supabase.co`). | Lovable → Cloud settings, ose Supabase Dashboard → Project Settings → API. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts` | Anon/publishable key — e sigurt për browser, mbrohet nga RLS. | Njësoj si më sipër. |
| `VITE_SUPABASE_PROJECT_ID` | `src/integrations/supabase/client.ts` | Refi i shkurtër i projektit (p.sh. `abcxyz1234`). | Nga URL i projektit. |

> Ndryshojeni **vetëm** përmes lidhjes Cloud te Lovable. Në produksion Lovable e menaxhon `.env` automatikisht kur projekti është i lidhur me Cloud.

---

## Edge Function Secrets (Supabase Secrets)

**S'shkojnë në `.env`.** Konfigurohen te Supabase Dashboard → Edge Functions → Secrets, ose përmes Lovable Cloud UI. Vlerat lexohen në runtime me `Deno.env.get(...)`.

### Sistem (auto-siguruar nga Supabase — nuk i vë ti)

| Variable | Përshkrim |
|---|---|
| `SUPABASE_URL` | URL i projektit — auto. |
| `SUPABASE_ANON_KEY` | Anon key — auto. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) — auto, kurrë s'ekspozohet në client. |
| `SUPABASE_DB_URL` | Postgres connection string — auto. |
| `LOVABLE_API_KEY` | Auto — nëse projekti është në Cloud, jep akses te Lovable AI Gateway (`staff-chat`, `scan-mulliri`). |

### User-provided (duhen konfiguruar manualisht)

| Variable | Përshkrim | Nga vjen |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token i bot-it Telegram për njoftime staf-i. | @BotFather → `/newbot` → tokeni. |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key. | Gjenero një çift `npx web-push generate-vapid-keys`. |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key. | Njësoj — mbaje sekret. |
| `CLEANUP_SECRET` | Shared secret për `cleanup-chat-sessions` (header `x-cleanup-secret`). | Gjenero string të rastësishëm (≥ 32 chars). |
| `INTERNAL_WEBHOOK_SECRET` | Shared secret midis DB-triggers dhe funksioneve `send-push`/`notify-telegram` (header `x-internal-secret`). | Gjenero string të rastësishëm; e njëjta vlerë duhet të vihet edhe brenda funksioneve trigger. |
| `FOOTBALL_DATA_API_KEY` | Opsional — nëse aktivizohet feature-i i futbollit. | football-data.org → Register → API token. |

---

## Konfigurim brenda databazës (jo env)

Disa "sekrete" ruhen te tabela `app_settings`, jo si env:

- `venue_qr_secret` — përdoret te `manage-shift` për të mbrojtur krijimin e shift-token-eve.  Rifresko përmes `/admin-tools`.
- Chat ID Telegram (kur linkohet manualisht).

---

## Kontroll i shpejtë

```bash
# Frontend
cat .env | grep VITE_ | wc -l   # duhet 3

# Edge function secrets — nga Supabase CLI:
supabase secrets list
```

Nëse mungon njëra prej variablave frontend, aplikacioni ngarkon me `undefined` te client-i Supabase dhe të gjitha thirrjet dështojnë. Nëse mungon një secret te edge function, funksioni përkatës kthen 500 me mesazh pak të qartë — kontrollo `Edge Function Logs`.