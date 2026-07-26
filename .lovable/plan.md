## Qëllimi
Krijoj 4 file dokumentimi që inventarizojnë çdo burim real të projektit (kod, DB, funksione, storage, env), pa ndryshuar asnjë funksionalitet.

## Hapat e eksplorimit (para shkrimit)
1. Lexoj `src/integrations/supabase/types.ts` — nxjerr tabelat, kolonat, tipet, foreign keys, RPC-të dhe enum-et.
2. Listoj `supabase/migrations/` dhe lexoj çdo file për një përmbledhje 1-rreshtore.
3. Listoj `supabase/functions/` dhe lexoj `index.ts` të secilit për qëllimin.
4. Lexoj `supabase/config.toml`.
5. Kërkoj në gjithë kodin:
   - `supabase.storage.from(` → buckets
   - `import.meta.env.` → env vars
   - `Deno.env.get(` → secrets serverside
6. Lexoj `package.json`, `vite.config.ts`, `tailwind.config.ts`, README-t ekzistuese për kontekst.

## Skedarët që do të krijoj

### 1. `docs/PROJECT_INVENTORY.md`
- Seksioni **Tabelat** — për secilën: kolonat + tipet, FK, RLS status (nëse dihet nga migrations).
- Seksioni **RPC / Database Functions** — emri, argumentet, return type nga `types.ts` + korrelim me migrations.
- Seksioni **Enums** — lista (p.sh. `app_role`).
- Seksioni **Migrations** — lista e file-ve `supabase/migrations/*.sql` me përmbledhje 1-rreshtore.
- Seksioni **Edge Functions** — çdo folder në `supabase/functions/` me qëllimin nga kodi.
- Seksioni **Storage buckets** — çdo bucket i referencuar në kod (path + skedarët ku përdoret).
- Seksioni **Env variables** — çdo `import.meta.env.*` në frontend + `Deno.env.get(...)` në edge functions.

### 2. `docs/ENV_TEMPLATE.md` + `.env.example`
- `ENV_TEMPLATE.md` — tabelë me kolona: Variable | Përdoret te | Përshkrim | Ku merret.
- `.env.example` — placeholders për çdo env frontend të gjetur (`VITE_SUPABASE_URL=your-project-url-here`, etj.). Pa vlera reale.
- Përmend veçmas edge function secrets (nuk shkojnë në `.env` — konfigurohen te Supabase Secrets).

### 3. `docs/MISSING_RESOURCES_REPORT.md`
Tabelë e vetme me kolonat: **Burimi | Status | Si të rikrijohet**. Rreshtat:
- Supabase Project lidhja
- Database schema (tabela + kolona)
- RLS policies
- Database triggers
- Database functions (RPC)
- Edge Functions (kodi vs deployment)
- Storage buckets + imazhet
- Env vars frontend
- Edge Function Secrets
- Auth Providers (Google, email, etj.)
- Realtime publications
- Cron jobs (pg_cron nëse dihet)
- Webhooks (Telegram, etj.)
- Custom Domain
- GitHub lidhja
- Analytics

Për secilën "✗" / "⚠" jap hapat konkretë manualë.

### 4. `docs/RESTORE_GUIDE.md`
- **Hapi 1**: Lidhja me Lovable Cloud ose Supabase Project ekzistues (nga UI e Lovable).
- **Hapi 2**: Aplikimi i migrations (`supabase db push` ose manualisht një-nga-një nga Dashboard SQL editor).
- **Hapi 3**: Deploy i Edge Functions (Lovable e bën automatikisht kur lidhet Cloud; ndryshe `supabase functions deploy`).
- **Hapi 4**: Rikrijim i storage buckets + policies (lista e sakte nga file 1).
- **Hapi 5**: Konfigurimi i Secrets për edge functions.
- **Hapi 6**: Konfigurimi i Auth providers.
- **Hapi 7**: Rilidhja GitHub (nga Lovable UI).
- **Hapi 8**: Verifikim funksional (checklist).

## Rregulla që zbatoj
- Pa vlera reale sekrete, pa URL projekti, pa tokena — vetëm placeholders.
- Nëse një burim s'gjendet në kod, e shënoj shprehimisht si "nuk u gjet në repo — kërkon konfigurim manual".
- Zero ndryshime në kod aplikacioni.
