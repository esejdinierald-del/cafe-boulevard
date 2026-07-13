## Objektivi

Elvi nuk shënon dot **Gjendjen** te `/regjistrimi-ditor`. Duhet të përgatisim një **dosje të vetme konsultimi** (të ngjashme me atë që ke ngjitur për `/daily`) që përmban gjithë llogjikën, skemën e DB dhe kodin relevant, që ta dërgosh te Claude.ai për analizë. Në të njëjtën kohë, dokumenti do të shërbejë edhe si referencë e brendshme për debug.

## Hipoteza për problemin e Elvit (para se të nisim)

Te `RegjistrimiDitor.tsx` fusha **Gjendje** është editable vetëm kur:

```
editable = (turn.id === myTurnId) && !turn.is_locked
canEditGjendje = editable && !turn.turn_data.gjendjeConfirmedAt
```

Elvi ka të ngjarë të mos jetë "pronar" i turnit sepse:

1. Turni i fundit i pakyçur i takon një kamarieri tjetër dhe `localStorage.staff_name` te celulari i Elvit nuk përputhet me `shift_turns.staff_name` (ownership takeover kërkon match ekzakt të emrit).
2. Ose `staff_name` te localStorage është bosh / "Panjohur", ndaj takeover nuk aktivizohet.
3. Ose Elvi po shikon një tab turn i vjetër / i kyçur (`is_locked=true`).
4. Ose `gjendjeConfirmedAt` është vendosur më parë dhe kolona është bërë read-only.

Këto do t'i dokumentojmë në konsultë që Claude të propozojë zgjidhjen e duhur.

## Çfarë do të prodhoj

Një file të vetëm markdown në `/mnt/documents/regjistrimi-ditor-consultation.md` me këto seksione (analog me shembullin që solle):

1. **Përmbledhje në pika** — çfarë bën `/regjistrimi-ditor`, roli i turneve dinamike, faza Gjendje → Konfirmo → Dif.
2. **Skedarët që përbëjnë faqen** — tabelë me role:
   - `src/pages/RegjistrimiDitor.tsx` (orkestrimi)
   - `src/pages/Inventory.tsx` (furnizime → redirect)
   - `src/types/inventory.types.ts`
   - `src/services/inventoryCalculations.ts`
   - `src/services/inventoryStockPropagation.service.ts`
   - `src/services/inventorySalesAggregation.service.ts`
   - `src/hooks/useCoffeeSalesTotal.ts`, `useDifStartDates.ts`
   - `src/components/inventory/ProductManagerDialog.tsx`
   - Edge functions: `pos-get-inventory`, `validate-shift`, `scan-mulliri`, `manage-shift`
3. **Autentifikimi & ownership** — `staff_shift_token`, `validate-shift`, `staff_name` në localStorage, rregulli i "my turn" (marrja në pronësi e turnit të fundit të pakyçur nëse `staff_name` përputhet, përndryshe krijim turni të ri).
4. **Struktura e të dhënave** — `InventoryTurnData` (products/coffee/xhiro/mulliri/shpenzime + `gjendjeInputAt`, `gjendjeConfirmedAt`).
5. **Skema e DB** — `shift_turns`, `inv_products`, `inv_daily_entries`, `inv_next_day_stock`, `raw_materials`, `recipes`, `supplies`, `transactions`, `pos_orders`, `staff_members`, `user_roles` — me kolonat, RLS policies dhe GRANTs.
6. **Fluksi Furnizim → Regjistrim** — nga `Inventory.tsx` (multi-row) → `pos-get-inventory addSupply` → `add_supply` RPC → redirect në `/regjistrimi-ditor` me stok fillim të përditësuar.
7. **Fazat e turnit** — (A) vetëm Gjendje editable, (B) pas `Përfundova` shfaqen Stok/Shirit/Dif, (C) pas `Mbyll Turnin` bëhet lock. Rregullat për `editable`, `canEditGjendje`, `showOtherCols`, `canAdminEditStok`.
8. **Formulat** — `Dif = Shiriti + Gjendje − StokFillim`, propagimi T(n)→T(n+1) me `calculateStockForNextTurn`, mulliri `Dif = shitjeKafe + mulliriFillim − mulliriPerfund`.
9. **Shiriti live** — subscription realtime te `public.transactions` + polling 20s + `aggregateSalesByProduct`.
10. **Admin mode** — passcode `2025`, editim manual i Stok Fillim në çdo turn (edhe të kyçur), `rebaseFromGjendje`, `ProductManagerDialog`.
11. **Mulliri OCR** — `scan-mulliri` edge function me Gemini për të lexuar "Totale:" nga foto.
12. **Problemi konkret i Elvit** — çfarë duhet analizuar:
    - A ka Elvi `staff_name` në localStorage? (nga cili flow — QR ose PIN?)
    - A ekziston turni i tij te `shift_turns` për datën e sotme?
    - A është `myTurnId` null (rast kur turni i fundit është `is_locked=true` dhe s'është krijuar i ri)?
    - Snapshot i rreshtave aktualë te `shift_turns` për datën e sotme.
13. **Rreziqe / rregulla** — mos ndrysho formulën e Dif, mos zbrit `furnizime` dyfish (është shtuar te Stok Fillim), realtime `transactions` mund të mos triggerohet nëse RLS bllokon publikim.
14. **Pikat kyçe për debug të shpejtë** — rreshtat konkretë te `RegjistrimiDitor.tsx` ku vendoset ownership dhe editability.

## Diagnozë e shpejtë (para dërgimit)

Para se ta paketojmë, do të bëj një query të vogël te DB:

```sql
select id, entry_date, staff_name, sequence_number, is_locked,
       turn_data->>'gjendjeConfirmedAt' as confirmed
from shift_turns
where entry_date = current_date
order by sequence_number;
```

Plus lista e stafit aktiv (Elvi te `staff_members`). Nga këto do të kuptojmë a është problem i **ownership** apo i **konfirmimit të parakohshëm**. Rezultatin e fus në seksionin 12 të dosjes që Claude të ketë të dhëna të gjalla.

## Deliverable

- Një file: `/mnt/documents/regjistrimi-ditor-consultation.md` (~1500–2500 rreshta, self-contained).
- Përfshin kodin e plotë të 3 skedarëve kryesorë (`RegjistrimiDitor.tsx`, `inventoryCalculations.ts`, `inventoryStockPropagation.service.ts`) + snippets nga të tjerët.
- Përfshin SQL të skemës aktuale (`shift_turns`, `inv_*`, `raw_materials`, `recipes`, RLS).
- Pa modifikime kodi — vetëm dokument konsultimi.

## Jashtë objektit

- Nuk do të ndryshohet asgjë te `/regjistrimi-ditor` në këtë hap. Fiksin e vërtetë e bëjmë pasi Claude (ose ne) të konfirmojmë shkakun rrënjësor.
