## Problemi

Rruga `/inventory` ekziston te `src/App.tsx` dhe faqja `src/pages/Inventory.tsx` ngarkohet mirë kur ka `staff_shift_token` në localStorage. Kur mungon, `useEffect`-i te Inventory bën `navigate("/staff", { replace: true })` menjëherë — pra pa turn aktiv, user-i "del jashtë" faqes dhe zbret te ekrani i stafit, që lehtë ngatërrohet me 404.

Reprodukim i konfirmuar: hyrja direkte te `http://localhost:8080/inventory` ridrejtohet te `/staff`. Nuk ka error runtime, nuk ka route të munguar.

## Çka do bëjmë

1. **Rregullo guard-in te `src/pages/Inventory.tsx`**
   - Në vend të `navigate("/staff", { replace: true })` sapo mungon token-i, shfaq një ekran të vogël "Kërkohet turn aktiv" me buton *"Hap Stafi"* që të çon te `/staff`.
   - Kjo eliminon efektin "404 / faqe tjetër" kur user-i shkruan URL-në direkt ose e hap nga një tab i vjetër.

2. **Konfirmo lidhjen nga `/pos`**
   - Butoni "Inventari" te `POS.tsx:236` tashmë navigon saktë; do vetëm ta verifikojmë që në sesion me turn aktiv faqja hapet pa ridrejtim.

3. **Verifikim**
   - Playwright: `/inventory` pa token → tregon ekranin e ri (jo redirect).
   - Playwright: `/inventory` me token të vendosur në localStorage → ngarkon tabelën e materialeve.

## Detaje teknike

- Ndryshim vetëm te `src/pages/Inventory.tsx` (frontend, guard UI).
- Pa migrime DB, pa ndryshime edge functions, pa prekje te `RegjistrimiDitor`, `POS` apo rrjeti.

## Jashtë fushëveprimit

- Nuk prek `/regjistrimi-ditor`, `inv_products` apo shërbimet e inventarit të ditës.
- Nuk ndryshon logjikën e autentikimit të stafit (PIN, shift tokens).

Nëse "404" që sheh është diçka tjetër (p.sh. faqja `NotFound` me tekstin *"Faqja nuk u gjet"*, ose ekrani i ErrorBoundary), më thuaj sakt çfarë sheh dhe nga cili device/URL — ndryshon diagnoza.
