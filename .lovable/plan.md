## Ndryshimet në /inventory dhe /regjistrimi-ditor

### 1. Faqja /inventory — Shto Furnizim me listë të plotë artikujsh

**Aktualisht**: Hapet një dialog me një `select` ku zgjidhet një material dhe futet sasia (një nga një).

**E re**: Kur klikohet "Shto Furnizim", hapet një dialog i madh që shfaq **të gjithë artikujt kryesorë** (nga `raw_materials`) si listë me nga një input sasie për secilin. Stafi mbush vetëm ato që ka furnizuar (të tjerat lihen bosh/0), shton një shënim të përgjithshëm opsional, dhe shtyp **"Ruaj Furnizimet"**.

- Vetëm rreshtat me sasi > 0 dërgohen si furnizime (loop me `pos-get-inventory` action `addSupply`).
- Pas ruajtjes → toast sukses → **redirect automatik në `/regjistrimi-ditor`**.
- Lista e materialeve menaxhohet nga admin te `Manager Dashboard → Inventari` (ekzistuese via `ProductManagerDialog`); nuk kërkon modul të ri.

### 2. Faqja /regjistrimi-ditor — Fazë e re "Pritje Gjendje"

**Aktualisht** (nga turni i mëparshëm):
- Faza 1: Furnizime + Gjendje të dukshme, editohen bashkë, pastaj "Konfirmo Gjendjen".
- Faza 2: Gjithçka e kyçur, Stok Fillim & Dif të dukshme.

**E re** — tri faza:
- **Faza A (pas hyrjes nga /inventory)**: Furnizime tashmë të futura & të kyçura. **Gjendja fshihet**, **Stok Fillim & Dif fshihen**. Shfaqet vetëm kolona **Shiriti** (live nga POS) + Furnizime read-only. Butoni **"Fut Gjendjen"** shfaqet për ta hapur inputin e Gjendjes.
- **Faza B**: Pas klikimit "Fut Gjendjen" → shfaqet kolona Gjendje editable + butoni **"Konfirmo Gjendjen"**.
- **Faza C**: Pas konfirmimit → Stok Fillim & Dif të dukshme, gjithçka e kyçur.

**Shiriti**: gjithmonë auto nga transaksionet POS (subscription realtime ekzistues), asnjëherë manual. Anulimet zbresin automatikisht.

**Lista e produkteve**: e njëjtë me `raw_materials` (jo më `inv_products` — mapping-u bëhet përmes `recipes`). Kafeja mbetet rresht i veçantë siç është.

### 3. Detaje teknike

- **Update `src/pages/Inventory.tsx`**: zëvendëso dialogun me formë multi-row (një rresht për çdo material me input sasie + shënim global). Loop insert-e furnizimesh. `navigate("/regjistrimi-ditor")` pas suksesit.
- **Update `src/pages/RegjistrimiDitor.tsx`**:
  - Shto flag `furnizimeLocked` (default `true` nëse hyn nga /inventory, ose set kur ka furnizime > 0 sot).
  - Shto flag `gjendjeInputVisible` (kontrollohet nga butoni "Fut Gjendjen").
  - Rendering me tre faza në vend të dy.
  - Ndrysho burimin e produkteve nga `inv_products` te `raw_materials` (nëse nuk është bërë tashmë) — konfirmim i kërkuar.
- **Turn data** në `turn_data`: shto `furnizime_locked_at`, `gjendje_input_at`, `gjendje_confirmed_at`.
- Nuk preket receipe logic, POS, KDS, ose auth.

### Pyetje për konfirmim para se të filloj

1. Te `/regjistrimi-ditor`, produktet duhet të jenë **të gjithë `raw_materials`** (Coca Cola, Fanta, Gin, ... duke përfshirë ata në ml/g), apo vetëm një nënbashkësi (p.sh. jo përbërës të vegjël si "Domate", "Mocarella")? Nëse nënbashkësi, si të filtrohet — flag i ri `track_daily` në `raw_materials`?
2. "Fut Gjendjen" — a mund ta shtypë kushdo me shift aktiv (si `Konfirmo Gjendjen`), apo kërkon passcode admin?
