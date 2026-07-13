# Inventari me receta + workflow i bllokimit të kolonave

Kërkesa ka dy pjesë të lidhura. Të dyja ndërtohen tani; shiriti mbetet automatik (jo manual).

## Pjesa A — Receta & lidhja menu ↔ produkt kryesor

**Objektivi:** Kur shitet një menu-item (p.sh. Negroni, Pizza Margarita, Gotë Vere), të zbriten sasi të sakta në ml/g/copë nga një ose më shumë produkte kryesore inventari (Gin, Vermouth, Miell, Mocarella…).

Infrastruktura ekziston tashmë:
- `recipes` table: `menu_item_id → material_id → quantity_needed`
- `raw_materials` mbështet njësi `ml, g, kg, L, cope`
- `pos-confirm-order` Edge Function tashmë thërret `decrement_material` kur porosia bëhet "Gati"

Çfarë ndërtohet:

1. **Faqe e re "Receta" në Manager Dashboard** (`/manager` → tab i ri "Receta")
   - Listim i menu-items me kutinë e recetës
   - Për çdo menu-item: shto/hiq rreshta `(raw_material, sasi, njësi)`
   - Për kokteje/pizza: shumë rreshta (Negroni = Gin 10ml + Vermouth 20ml + Campari 10ml)
   - Filtri sipas kategorisë + kërkim

2. **Përditësim i `raw_materials`** me produktet kryesore që mungojnë
   - Ndarje sipas njësisë: `ml` për alkool të hapur/kokteje, `cope` për kanace, `g/kg` për ushqime
   - Migracion SQL që shton produktet e reja standard (Gin, Rum, Tequila, Triple Sec, Campari, Vermouth i ëmbël, Cola, Fanta, Ivi, Çaj i ftohtë, Bravo, Verë e hapur, Miell për pizza, Mocarella, Bazë sallate, Vezë, etj.)
   - Vlerat fillestare = 0; menaxheri i vendos në UI

3. **Seed automatik i recetave** për shembujt që dha përdoruesi:
   - Coca-Cola, Fanta, Ivi, Çaj i ftohtë, Bravo → 1 copë kanace
   - Gotë vere → 200ml verë e hapur (0.2L)
   - Gotë vere 0.5L → 500ml verë e hapur
   - Negroni → 10ml Gin + 20ml Vermouth i ëmbël + 10ml Campari
   - Long Island Iced Tea → 15ml Vodka + 15ml Gin + 15ml Tequila + 15ml Rum + 15ml Triple Sec + 25ml lëng limoni + 20ml shurup + 40ml Cola
   - Të tjerat i shton menaxheri manualisht në UI

## Pjesa B — Workflow i kolonave në Regjistrimi Ditor

**Rrjedha e re për çdo produkt në një turn:**

```
Faza 1 (turn aktiv, staf duke punuar):
  [Furnizime] editable    [Gjendja reale] editable
  StokFillim, Dif = TË FSHEHURA
  Shiriti = auto nga POS (rritet me shitje, zbret me anulim)

Butoni "Konfirmo Gjendjen":
  → bllokon Furnizime + Gjendja reale
  → shfaq StokFillim (nga turni i mëparshëm + propagim, staf nuk e prek dot)
  → shfaq Dif = StokFillim + Furnizime − Shiriti − Gjendja
  → Shiriti mbetet i lidhur me POS (vazhdon të lëvizë deri sa turni mbyllet)
```

**Zbatimi teknik:**
- Në `shift_turns.turn_data` shtoj flag `gjendje_confirmed_at` (timestamp)
- Në UI-në e tabelës së produkteve: kolonat renditen `Furnizime | Gjendja | [Konfirmo] → Stok Fillim | Shiriti | Dif`
- Para konfirmimit: vetëm Furnizime + Gjendja + Shiriti (readonly) të dukshme; Stok Fillim/Dif me placeholder "—"
- Pas konfirmimit: të gjitha kolonat të dukshme, vetëm Shiriti vazhdon të përditësohet
- Butoni "Konfirmo Gjendjen" (jeshil) del në fund të tabelës, i disabled deri sa të plotësohet Gjendja për të paktën një produkt
- Konfirmimi nuk kërkon passcode (kushdo me shift aktiv, sipas përgjigjes së pyetjes)
- Pas konfirmimit butoni zëvendësohet me shirit "🔒 Gjendja u konfirmua në HH:MM"

**Shiriti live nga POS:**
- Realtime subscription në `transactions` në faqen e Regjistrimit Ditor
- Kur mbërrin një transaksion i ri me `created_at >= turn.started_at`, ri-aggregoj shitjet dhe përditësoj `shiriti` për çdo produkt
- Kjo bëhet edhe kur porosi anulohet (transaksioni fshihet ose bëhet negative) → shiriti zbret

## Renditja e ndërtimit

1. Migracion: shto `gjendje_confirmed_at` në turn_data (jsonb, s'kërkon schema change), shto produktet e reja në `raw_materials`, seed recetat bazë
2. Ndërto `RecipeManager.tsx` në `src/components/manager/`
3. Regjistroje si tab të ri në `ManagerDashboard.tsx`
4. Modifiko `RegjistrimiDitor.tsx`: tabelën e produkteve me kolonat me faza + butoni Konfirmo
5. Shto realtime subscription për Shiriti live
6. Verifiko me build

## Çfarë NUK përfshihet (për prompt të dytë sipas nevojës)

- UI për ndryshim direkt të `raw_materials.quantity` (menaxheri i azhurnon nga fatura ose /inventory ekzistuese)
- Konfirmim me passcode admin (u zgjodh "kushdo me shift")
- Sistem kafe/alkool/shpenzime templates (mbetet i pandryshuar)
- Alarme low-stock automatike (raw_materials.min_threshold ekziston, mund të lidhet më vonë)

Nëse plani është ok, e ndërtoj në një hap.
