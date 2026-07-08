
# Menaxhim Kamarierësh + Ndryshim Password Admin

## Objektivi
Zëvendëso token-in e vetëm të përbashkët me kamarierë individualë (emër + PIN + rol), dhe lejo ndryshimin e password-it të admin-it nga UI në vend të secret-it në edge function.

## 1. Databaza (migration i re)

### Tabela `staff_members`
```
id          uuid PK
name        text  (unik)
pin_hash    text  (SHA-256 i PIN-it 4 shifror)
role        text  ('waiter' | 'kitchen' | 'manager')
active      boolean default true
created_at  timestamptz
```
- RLS ON; SELECT/INSERT/UPDATE/DELETE vetëm nga `service_role` (të gjitha operacionet kalojnë përmes edge function-eve).
- `GRANT` për `service_role`; asnjë grant për `anon`/`authenticated`.

### Tabela `app_settings`
```
key    text PK
value  text
```
- Përdoret p.sh. për `admin_passcode` (SHA-256). Nëse row-i mungon → fallback `2025`.
- RLS ON, akses vetëm `service_role`.

### Turni ekzistues
Mbahet siç është (`shift_tokens` + QR). PIN-i i kamarierit **plotëson** — nuk zëvendëson — token-in: fillimisht skanohet QR-ja e turnit (si tani), pastaj kamarieri fut emrin+PIN për t'u identifikuar personalisht.

## 2. Edge functions të reja

### `manage-staff` (kërkon manager auth, si `manage-shift`)
Veprimet: `list`, `create {name, pin, role}`, `update {id, name?, role?, active?, pin?}`, `delete {id}`. PIN-i hash-ohet me SHA-256 para se të ruhet.

### `verify-staff-pin` (public)
Body: `{ name, pin, shiftToken }`. Verifikon që `shiftToken` është aktiv + i unlock-uar, pastaj krahasson `pin_hash`. Kthen `{ ok, role, name }`. Klienti ruan në `localStorage`: `staff_name`, `staff_role`.

### `manage-admin-passcode` (kërkon manager auth)
- `GET`: kthen `{ isSet: true|false }` (kurrë vetë vlerën).
- `POST {newPasscode}`: ruan hash-in në `app_settings.admin_passcode`.

### `pos-cancel-item` (update)
Në vend të krahasimit tekst me tekst, bëj hash SHA-256 të `adminPassword` që vjen nga klienti dhe krahasoje me `app_settings.admin_passcode`. Fallback: `SHA-256("2025")` nëse row-i mungon.

## 3. Frontend

### ManagerDashboard — dy karta të reja
1. **"Kamarierët"**
   - Listë me emër, rol, aktiv/joaktiv, butona Edit / Fshi / Reset PIN.
   - Dialog "Shto Kamarier": emër, rol (dropdown waiter/kitchen/manager), PIN 4 shifror.
   - Reset PIN: dialog i thjeshtë me input të ri.

2. **"Fjalëkalimi i Admin-it"**
   - Tregon status: "I caktuar" ose "Duke përdorur default (2025)".
   - Input i ri + konfirmim + buton "Ruaj". Minimumi 4 karaktere.

### `/staff` (StaffShift.tsx)
Pas skanimit të QR-së (ekzistues), shto një hap të vogël:
- Dropdown me kamarierët aktivë (nga `verify-staff-pin` list-endpoint public i kufizuar në `name`+`role`, ose thjesht dropdown i marrë nga `manage-staff` me anon key… më e pastër: një endpoint i vogël `list-staff-names` public që kthen vetëm `{name, role}`).
- Input PIN. Butoni "Hyr" → `verify-staff-pin`.
- Pas suksesit ruan `staff_name` + `staff_role` në localStorage dhe vazhdon në ekranin ekzistues të turnit.
- Buton "Ndrysho përdorues" që fshin `staff_name`/`staff_role` pa fshirë token-in.

## 4. Detaje teknike

- Hash-imi SHA-256 bëhet në Deno me `crypto.subtle.digest`. Përdor një helper të përbashkët (kopjuar) në `manage-staff`, `verify-staff-pin`, `manage-admin-passcode`, `pos-cancel-item`.
- ManagerDashboard tashmë ka manager auth (Supabase auth + `user_roles`), pra `Authorization` header do të dërgohet automatikisht nga klienti Supabase.
- `staff_role` ekzistues në localStorage vazhdon të funksionojë me gating (POS.tsx / Inventory.tsx) — asnjë ndryshim atje.
- Nuk ndryshohet as `types.ts` me dorë; do të rigjenerohet automatikisht pas migration-it.

## 5. Skedarët

**Të rinj**
- `supabase/migrations/<ts>_staff_members_and_settings.sql`
- `supabase/functions/manage-staff/index.ts`
- `supabase/functions/verify-staff-pin/index.ts`
- `supabase/functions/manage-admin-passcode/index.ts`
- `supabase/functions/list-staff-names/index.ts` (public, vetëm emra aktivë)
- `src/components/manager/StaffManagerCard.tsx`
- `src/components/manager/AdminPasscodeCard.tsx`
- `src/components/staff/StaffPinLogin.tsx`

**Të modifikuar**
- `src/pages/ManagerDashboard.tsx` — dy kartat e reja
- `src/pages/StaffShift.tsx` — hapi PIN pas token-it
- `supabase/functions/pos-cancel-item/index.ts` — verifikim nga `app_settings`

## 6. Sigurie
- PIN-e dhe passcode ruhen vetëm si hash.
- Të gjitha ndryshimet e menaxhimit kalojnë përmes edge functions që kërkojnë rol `manager`.
- Endpoint-i public i emrave kthen vetëm `name` + `role` — asnjë hash, asnjë PIN.

## Jashtë fushëveprimit (mund të bëhet më vonë)
- Audit log për ndryshim password/kamarierësh.
- 2FA për manager.
- Lockout pas X PIN-eve të gabuara.
