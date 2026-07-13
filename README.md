# Boulevard Café

Aplikacion i plotë menaxhimi për kafenenë Boulevard (Elbasan): menu për klientët me QR, POS për kamarierët, KDS për kuzhinën, Arka, Dashboard menaxheri, Inventar & Regjistrim Ditor, turne stafi me QR/PIN, printim në cloud, AI assistant, feedback dhe push notifications.

**Live**: https://cafe-boulevard.lovable.app

## Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn-ui, React Router, React Query
- **Backend**: Lovable Cloud (Supabase) — Postgres + RLS, Realtime, Edge Functions (Deno), Storage
- **PWA**: manifest + service worker për stafin dhe klientët
- **Gjuhë**: Shqip / English (bilingual)
- **Timezone**: Europe/Rome — **Valuta**: Lekë

## Modulet

| Rrugë | Përshkrim |
| --- | --- |
| `/` | Landing i klientit (thirr kamarier, kërko faturë, hap menynë) |
| `/menu` | Menyja e plotë me kategori, oferta 🔥, porosi direkte |
| `/pos` | Paneli i kamarierit — tavolina, porosi, split, mbyllje turni |
| `/dashboard` | KDS Kuzhinë + Bar + Arka + historik (admin, passcode `2025`) |
| `/manager-login` → `/manager` | Menaxhimi i menusë, kategorive, stafit, recetave, admin passcode |
| `/inventory` | Furnizime ditore për produktet kryesore |
| `/regjistrimi-ditor` | Regjistrim gjendje/shirit/dif për 2 turne me formulë të kontrolluar |
| `/staff` | Login stafi me QR ose PIN, geofencing 75m |
| `/print-station` | Klient PC që tërheq nga `print_jobs` dhe printon në 80mm |

## Logjika kryesore

- **Porositë**: kamarieri krijon → banaku konfirmon (`pos-confirm-order`) → shitja regjistrohet menjëherë te `transactions` → material inventari zbritet nga `recipes` → mbyllja tek Arka thjesht liron tavolinën pa dublikatë.
- **Regjistrimi Ditor**: `Dif = Shiriti + Gjendje − StokFillim`. Për kafe: `Dif = shitjeKafe + mulliriFillim − mulliriPerfund` (mulliri lexohet OCR nga foto me `scan-mulliri`).
- **Turne**: `shift_turns` dinamike, ownership me `staff_name` te localStorage, edge function `manage-shift` proxy për RLS.
- **Admin mode**: passcode `2025` te DB — mund të editojë Stok Fillim manualisht në çdo turn.
- **Realtime**: subscription te `transactions` + polling backup 20s për Shiritin.
- **Push**: VAPID + `send-push` edge function për njoftime në background.

## Zhvillimi lokal

```sh
npm i
npm run dev      # http://localhost:8080
npm run build
npm run lint
```

Variablat te `.env` (auto-managed nga Lovable Cloud):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

## Struktura e projektit

```
src/
  pages/            # Rrugët kryesore (Menu, POS, Dashboard, RegjistrimiDitor, ...)
  components/       # UI, ikona custom SVG, POS, inventory, manager, staff
  hooks/            # use-pos, use-language, useCoffeeSalesTotal, useDifStartDates ...
  services/         # inventoryCalculations, inventoryStockPropagation, salesAggregation
  integrations/     # Supabase client (auto-gen)
  lib/              # rome-time, receipt-print, print-queue, utils
  styles/           # boulevard.css (dark luxury tokens)
supabase/
  functions/        # 25+ Edge Functions (POS, staff, push, OCR, admin ...)
  migrations/       # SQL skema + RLS + GRANTs
public/             # PWA manifests, staff-sw.js, QR codes
```

## Konsulta të plota

Për debugging më të thellë ose reviews me AI të jashtme, gjenerohet snapshot i plotë (kod + skemë):
`/mnt/documents/boulevard-cafe-full-snapshot.md`.

## Publikimi

Publikohet përmes Lovable (Share → Publish). Domeni custom lidhet nga Project → Settings → Domains.