# Boulevard Café - Dokumentacioni i Aplikacionit

## Përmbledhje e Projektit

Boulevard Café është një aplikacion web për menaxhimin e shërbimeve në kafene. Aplikacioni lejon klientët të kërkojnë shërbime direkt nga tavolina dhe stafin të menaxhojë kërkesat në kohë reale.

## Struktura e Projektit

```
boulevard-cafe/
├── src/
│   ├── pages/
│   │   ├── Index.tsx           # Faqja kryesore (landing page)
│   │   ├── Menu.tsx            # Menyja e produkteve
│   │   ├── Dashboard.tsx       # Paneli i stafit
│   │   ├── ManagerLogin.tsx    # Hyrja për menaxherë
│   │   └── ManagerDashboard.tsx # Paneli i menaxherit
│   ├── components/ui/          # Komponentë UI të ripërdorshëm
│   ├── integrations/supabase/  # Integrimi me backend
│   └── hooks/                  # React hooks të personalizuar
├── public/                     # Asetet statike
└── supabase/                   # Konfigurimi i backend-it
```

## Teknologjitë e Përdorura

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase)
- **Routing**: React Router
- **State Management**: React Query
- **Gjuhë**: Shqip dhe Anglisht

---

# MANUALI I PËRDORIMIT

## PËR KLIENTËT

### 1. Hyrja në Aplikacion

Klientët skanojnë kodin QR në tavolinë për të hapur aplikacionin. Automatikisht identifikohet numri i tavolinës.

### 2. Funksionalitetet Kryesore

#### a) Thirrja e Kamarierit
1. Klikoni butonin **"Thirr Kamarier"** (Call Waiter)
2. Kamarieri do të marrë njoftim në panelin e tij
3. Do të merrni konfirmim që kërkesa është dërguar

#### b) Kërkimi i Faturës
1. Klikoni butonin **"Kërko Faturën"** (Request Bill)
2. Kamarieri do të sjellë faturën në tavolinën tuaj
3. Prisni konfirmimin

#### c) Porositja nga Menyja
1. Klikoni butonin **"Porosit nga Menyja"** (Order from Menu)
2. Shfletoni kategoritë e produkteve
3. Zgjidhni produktet që dëshironi
4. Konfirmoni porosinë

### 3. Ndërrimi i Gjuhës

Klikoni butonin e flamurit në këndin e sipërm djathtas për të ndërruar midis Shqipes dhe Anglishes.

---

## PËR STAFIN (Dashboard)

### 1. Hyrja në Dashboard

Stafi hyn në `/dashboard` për të parë kërkesat e klientëve në kohë reale.

### 2. Paneli i Kërkesave

#### Funksionalitete:
- **Shikimi i kërkesave aktive** - Lista e të gjitha kërkesave që presin përgjigje
- **Numri i tavolinës** - Identifikimi i tavolinës që ka bërë kërkesën
- **Lloji i kërkesës** - Kamarier ose Faturë
- **Koha** - Kur është bërë kërkesa
- **Ngjyrat** - Kërkesat e reja janë më të dukshme

#### Veprime:
- **Shëno si të Kryer** - Kur keni përmbushur kërkesën
- **Njoftimet Audio** - Tingull për çdo kërkesë të re
- **Përditësim Automatik** - Lista përditësohet në kohë reale

### 3. Menaxhimi i Kërkesave

1. Prisni njoftimin për kërkesë të re
2. Lexoni detajet e kërkesës (tavolina, lloji)
3. Shkoni të kryeni shërbimin
4. Klikoni "Mark as Completed" kur mbaroni
5. Kërkesa do të fshihet nga lista

---

## PËR MENAXHERËT

### 1. Hyrja në Sistem

1. Shkoni në `/manager-login`
2. Vendosni kredencialet:
   - **Email**: manager@boulevard-cafe.com
   - **Password**: manager123
3. Klikoni "Login"

### 2. Paneli i Menaxherit (Manager Dashboard)

#### Funksionalitete:

##### a) Menaxhimi i Produkteve
- **Shto Produkt të Ri**
  - Emri i produktit
  - Përshkrimi
  - Çmimi
  - Kategoria
  - Imazhi (opsionale)
  
- **Modifiko Produkt**
  - Përditëso çdo fushë
  - Ruaj ndryshimet

- **Fshi Produkt**
  - Hiq produkte që nuk ofrohen më

##### b) Menaxhimi i Kategorive
- **Shto Kategori të Re**
  - Emri i kategorisë
  - Pozicioni (renditja)
  
- **Modifiko Kategori**
  - Riemërto kategorinë
  - Ndrysho renditjen

- **Fshi Kategori**
  - Fshi kategoritë bosh

##### c) Statistikat
- Numri total i produkteve
- Numri i kategorive
- Kërkesat e fundit të klientëve
- Të dhëna në kohë reale

### 3. Best Practices për Menaxherët

- ✅ Përditësoni menynë rregullisht
- ✅ Mbani çmimet të sakta
- ✅ Shtoni përshkrime të qarta për produkte
- ✅ Përdorni imazhe cilësore
- ✅ Organizoni kategoritë logjikisht
- ✅ Testoni aplikacionin para ndryshimeve të mëdha

---

## STRUKTURA E DATABAZËS

### Tabelat Kryesore:

#### 1. `service_requests`
Ruan kërkesat e klientëve për shërbim.

```
- id (uuid)
- table_number (text)
- request_type (text: 'waiter' | 'bill')
- status (text: 'pending' | 'completed')
- created_at (timestamp)
```

#### 2. `menu_categories`
Kategoritë e menysë.

```
- id (uuid)
- name (text)
- position (integer)
- created_at (timestamp)
```

#### 3. `menu_items`
Produktet në meny.

```
- id (uuid)
- category_id (uuid)
- name (text)
- description (text)
- price (decimal)
- image_url (text)
- created_at (timestamp)
```

---

## ZGJIDHJA E PROBLEMEVE

### Problem: Kërkesa nuk dërgohet
**Zgjidhje**: 
- Kontrolloni lidhjen e internetit
- Rifreskoni faqen
- Provoni përsëri

### Problem: Dashboard nuk përditësohet
**Zgjidhje**:
- Sigurohuni që jeni të kyçur
- Rifreskoni faqen
- Kontrolloni shfletuesin

### Problem: Nuk mund të hyj si menaxher
**Zgjidhje**:
- Verifikoni kredencialet
- Kontaktoni administratorin
- Resetoni fjalëkalimin

### Problem: Produktet nuk shfaqen
**Zgjidhje**:
- Sigurohuni që produktet janë shtuar
- Kontrolloni që kategoritë ekzistojnë
- Rifreskoni faqen

---

## MIRËMBAJTJA

### Backup i të Dhënave
Të dhënat ruhen automatikisht në Lovable Cloud. Rekomandohet backup periodik nga paneli i menaxherit.

### Përditësimet
Aplikacioni përditësohet automatikisht. Ndryshimet në kod publikohen duke klikuar "Update" në platformën Lovable.

### Siguria
- Kërkesat ruhen me kohë
- Vetëm menaxherët mund të modifikojnë menynë
- Të dhënat janë të enkriptuara

---

## KONTAKTI DHE MBËSHTETJA

Për çdo problem teknik ose pyetje:
- **Facebook**: facebook.com/boulevard-cafe
- **Instagram**: instagram.com/boulevard-cafe

---

## SHËNIME TEKNIKE PËR ZHVILLUESIT

### Instalimi Lokal

```bash
# Klono projektin
git clone [repository-url]

# Instalo dependencat
npm install

# Niso serverin e zhvillimit
npm run dev
```

### Variablat e Mjedisit

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

### Komanda të Dobishme

```bash
npm run dev          # Niso serverin e zhvillimit
npm run build        # Build për prodhim
npm run preview      # Preview i build-it
npm run lint         # Kontrollo kodin
```

### Shtimi i Funksionaliteteve të Reja

1. Krijo komponentin në `src/components/`
2. Shto routing në `src/App.tsx`
3. Testo lokalisht
4. Publiko përmes Lovable

---

**Versioni**: 1.0  
**Data**: 2025  
**Aplikacioni**: Boulevard Café Management System