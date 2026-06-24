## Çfarë do të përfshihet në ZIP

Një arkiv i vetëm `boulevard-cafe-full.zip` me **gjithë kodin + llogjikën** e projektit, i strukturuar qartë që Claude (ose çdo AI tjetër) ta lexojë lehtë.

### Përmbajtja

1. **Frontend i plotë**
   - `src/` — të gjitha faqet, komponentët, hooks, stilet, ikonat
   - `public/` — manifest, service workers, QR codes
   - `index.html`, konfigurimet (`vite.config.ts`, `tailwind.config.ts`, `tsconfig*`, `package.json`, `components.json`, `postcss.config.js`, `eslint.config.js`)

2. **Backend i plotë (Lovable Cloud / Supabase)**
   - `supabase/functions/` — të 8 Edge Functions (staff-chat, manage-shift, validate-shift, unlock-shift, complete-request, send-push, push-subscribe, cleanup-chat-sessions)
   - `supabase/config.toml`
   - `supabase/migrations/` — të gjitha migrimet SQL (skema e plotë e DB: tabelat, RLS policies, funksionet, triggers)

3. **Dokumentacioni**
   - `DOKUMENTACIONI.md` (ekzistues)
   - `README.md`
   - `.lovable/plan.md`
   - `STRUCTURE.md` (i ri) — pemë e plotë e dosjeve me përshkrim të shkurtër për çdo file kryesor, pikat hyrëse, rrjedhat (customer flow, staff flow, manager flow), dhe lista e tabelave të DB

4. **Konfigurimi i mjedisit**
   - `.env` (vetëm çelësat publikë: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`)

### Çfarë do të përjashtohet
- `node_modules/`, `dist/`, `.git/`, log files, cache — për të mbajtur ZIP-in të lehtë (~5 MB në vend të ~300 MB)
- Asnjë sekret privat (service role key, DB password nuk janë të aksesueshme në Lovable Cloud)

### Output
- File: `/mnt/documents/boulevard-cafe-full.zip`
- Madhësia e pritshme: ~5 MB
- I shfaqur si artifact për shkarkim direkt

### Hapat teknikë
1. Eksportoj migrimet SQL nga DB (skema + RLS + functions)
2. Gjeneroj `STRUCTURE.md` duke kaluar nëpër `src/`, `supabase/functions/`, dhe duke listuar tabelat
3. Krijoj ZIP duke përjashtuar dosjet e padobishme
4. Verifikoj përmbajtjen (numër file-sh, dosjet kryesore)
