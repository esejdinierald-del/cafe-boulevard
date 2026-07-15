# Plani i ndryshimeve

Dy kërkesa të ndara, por të lidhura nga i njëjti model i ri autorizimi: **admin = person specifik i stafit**, jo një kod global.

---

## 1) Model i ri autorizimi për admin

### Migrim SQL (`staff_members`)
Shto në tabelën `staff_members`:
- `is_admin BOOLEAN NOT NULL DEFAULT false` — flamur për të përcaktuar kush ka të drejta admini (pavarësisht nga `role` bazë si "waiter"/"kitchen"/"manager").
- `admin_password_hash TEXT` — bcrypt hash (jo SHA-256), unik për çdo staf. `NULL` = ky staf s'ka fjalëkalim admin.
- (Salt-i vjen automatikisht nga `extensions.crypt` / `gen_salt('bf',10)` — e njëjta gjë që përdorim për PIN-in.)

RLS mbetet e njëjtë: `staff_members` s'ka policy publike, aksesi bëhet vetëm nga edge functions me service role. Grants nuk ndryshojnë.

### Funksione të reja RPC (SECURITY DEFINER)
- `set_staff_admin_password(p_id uuid, p_password text)` — bcrypt hash, minimum 6 karaktere.
- `verify_staff_admin_password(p_staff_id uuid, p_password text) → boolean` — konstant në kohë përmes `crypt()`, kthen `true` vetëm nëse `is_admin = true` **dhe** hash-i përputhet **dhe** `is_active = true`.

### Edge function e re: `verify-staff-admin`
Merr `{ staffId, password }`, thërret RPC-në më sipër, rate-limited (5/5min si `verify-admin-passcode`), CORS të njëjtë me admin.
Kthen `{ valid: true, staff: { id, name } }` ose 403.

### Edge function e re: `manage-staff-admin`
Vetëm për manager (kërkon `Authorization: Bearer` si `manage-staff`). Veprime:
- `grant` `{ id, password }` — vendos `is_admin=true` dhe cakton fjalëkalimin.
- `revoke` `{ id }` — heq `is_admin` dhe pastron `admin_password_hash`.
- `set_password` `{ id, password }` — vetëm ndryshim fjalëkalimi.
- `list_admins` — kthen stafin me `is_admin=true`.

### Frontend (Manager Dashboard → "Stafi")
Në `StaffManagerCard.tsx` shto për çdo staf:
- Checkbox/toggle **"Admin"** (thërret `grant`/`revoke`).
- Butonin **"Ndrysho fjalëkalimin admin"** që hap dialog me input password + konfirmim (thërret `set_password`).

---

## 2) Riaktivizim i turnit nga distanca (Kërkesa #1)

### UI
Në **ManagerDashboard** (tab i ri **"Turnet"** ose seksion në `AdminTools`) shto:
- Listë e `shift_tokens` aktive (shift-i i sotëm dhe i së nesërmes), me statusin `unlocked/locked/closed`.
- Për çdo shift të mbyllur para kohe → butoni **"Riaktivizo turnin"**.
- Dialogu kërkon fjalëkalimin **individual admin** të stafit të loguar (jo passcode global).

### Backend
Zgjero `unlock-shift` (ose krijo `reactivate-shift`) që të pranojë `{ token, staffId, adminPassword }` në vend të `adminPassword` të vetëm:
- Verifiko fjalëkalimin nëpërmjet `verify_staff_admin_password(staffId, adminPassword)`.
- Nëse OK → `UPDATE shift_tokens SET unlocked=true` (dhe rivendos `shift_end` në 06:00 të nesërme nëse ka skaduar plotësisht).
- Ruaj event në `audit_log` me `actor = staff name` për gjurmueshmëri.

Manager tashmë liston `shift_tokens` përmes `manage-shift` — riperdoret.

---

## 3) Heqja e admin passcode të përbashkët (Kërkesa #2)

### Vendet ku përdoret sot passcode-i global
- **CashierPanel** (Dashboard/Arka) — çelës i historikut.
- **Inventory.tsx** — për të zbuluar sasitë (blur off).
- **POSPanels.tsx** — për anulim item/porosie.
- **pos-cancel-item** edge function.
- **pos-get-inventory** (rregullim negativ i stokut).
- **manage-admin-passcode** (menaxhim i passcode-it te ManagerDashboard).

### Ndryshimet
Zëvendëso **çdo** thirrje të `verify-admin-passcode` dhe kontrollet inline të `passcode==="2025"` me:
1. Në UI: dialog që kërkon **fjalëkalimin e stafit të loguar aktualisht** (marrim `staffId` nga `useShiftCurtain` / `localStorage.staff_shift_token` payload ose nga `verify-staff-pin` që tashmë e ruan).
2. Në backend: çdo edge function që sot krahason `sha256(passcode) == app_settings.admin_passcode` do të përdorë `verify_staff_admin_password(staffId, password)`.

### Edge functions që preken
- `pos-cancel-item` — pranon `{ staffId, adminPassword }` në vend të `adminPasscode`.
- `pos-get-inventory` (dega e sasive negative) — po ashtu.
- Çdo funksion tjetër që sot pranon `adminPasscode`.

### `manage-admin-passcode` + `AdminPasscodeCard`
Hiqen nga UI (Manager Dashboard). Migrimi nuk fshin `app_settings.admin_passcode` menjëherë — e lëmë të papërdorur për siguri gjatë tranzicionit; mund të pastrohet më vonë.

### Fallback / migrim i butë
Nëse asnjë staf s'ka ende `is_admin=true` në momentin e deploy-it, veprimet admin do të bllokohen. Prandaj në të njëjtin migrim:
- Vendosim automatikisht `is_admin=true` për stafin me `role='admin'` ose `role='manager'` që ekziston sot.
- Për ta bërë sistemin të përdorshëm menjëherë, seed-ojmë një fjalëkalim fillestar për këto llogari (menaxheri e ndryshon menjëherë nga UI).

---

## 4) Verifikimi

- Build TypeScript pa gabime (`tsgo`).
- ESLint pa warnings të reja.
- RLS linter i pastër (asnjë tabelë e re, vetëm kolona shtesë; policies të pandryshuara).
- Test manual: hyrje me PIN si kamarier normal → veprimet admin bllokohen; hyrje si kamarier me `is_admin=true` + fjalëkalim → hap Arkën, sasitë e inventarit, dhe riaktivizon një shift test.

---

## Skedarët që preken

**Migrim SQL (i ri):** kolona + funksione RPC.

**Edge functions (të reja):** `verify-staff-admin`, `manage-staff-admin`, (opsionale) `reactivate-shift`.
**Edge functions (të modifikuara):** `pos-cancel-item`, `pos-get-inventory`, `unlock-shift`.

**Frontend:**
- `src/components/manager/StaffManagerCard.tsx` — toggle admin + fjalëkalim.
- `src/pages/ManagerDashboard.tsx` — tab i ri "Turnet" për riaktivizim.
- `src/components/pos/POSPanels.tsx` — dialog i ri fjalëkalimi (individual).
- `src/pages/Dashboard.tsx` (CashierPanel) — po ashtu.
- `src/pages/Inventory.tsx` — po ashtu.
- Hiqet `src/components/manager/AdminPasscodeCard.tsx` nga UI.

Kur ta miratosh, e zbatoj tërësinë në një hap.
