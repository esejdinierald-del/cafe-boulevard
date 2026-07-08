# Dokument teknik për konsultim — Cafe Boulevard

## Qëllimi
Të prodhoj një file të vetëm Markdown që përshkruan **të gjithë kodin dhe llogjikën** e projektit, i strukturuar për t'u dërguar dikujt tjetër (ose një AI-je tjetër) me qëllim konsultimi për përmirësime të reja pa qenë nevoja të lexojë çdo skedar.

## Ku do ta ruaj
`/mnt/documents/boulevard-technical-reference.md` — që të jetë menjëherë i shkarkueshëm nga ti si artefakt.

## Struktura e file-it

1. **Përmbledhje e projektit** — çfarë është (PWA për kafe/restorant në Elbasan), stack (React + Vite + TS + Tailwind + Lovable Cloud/Supabase), gjuha SQ/EN, valuta Lekë, timezone Rome.
2. **Arkitektura e përgjithshme** — diagram ASCII i flukseve: klient (QR → menu → porosi) / kamarier (PWA POS) / kuzhinë-bar (KDS) / manager dashboard / print-station.
3. **Rutat & faqet** (`src/App.tsx` + `src/pages/*`) — çdo rutë me qëllimin, guards (PWAAuthGate, passcode), dhe komponentët kryesorë.
4. **Modeli i të dhënave** — tabelat kryesore në Supabase (menu_items, tables, pos_orders, order_items_split, print_jobs, staff_shifts, feedback, chat_sessions, etj.), kolonat kryesore, RLS-ja në përgjithësi.
5. **Edge Functions** — listë e të gjitha `supabase/functions/*` me qëllimin dhe input/output.
6. **Fluksi i porosive (POS)** — nga celulari i kamarierit deri te KDS-të (bar/kuzhinë), split-imi bar/kuzhinë, çmimi aktiv (oferta që kalon mesnatën), mbyllja e tavolinës, faturimi.
7. **Sistemi i printimit** — `print_jobs` + `/print-station` + `receipt-print.ts` + Chrome kiosk-printing (arkitektura e re) dhe fallback-et.
8. **Menu & Oferta** — struktura e kategorive, `display_order`, `available`, oferta me `offer_start_time/offer_end_time` që mund të kalojnë mesnatën, ikona 🔥.
9. **Autentikimi & Roles** — Staff PIN, shift management (10s/5m checks), manager passcode 2025, dashboard proxy `manage-shift`, RLS për `user_roles`.
10. **Njoftimet** — kambana e kuzhinës (5 beeps + vibration 15s), Web Push (VAPID, `send-push`), realtime Supabase.
11. **AI Assistant** — Gemini 2.5 Flash, kontekst dinamik nga DB, auto-clear >24h.
12. **Feedback** — rating 1-5, akses vetëm manager/admin.
13. **PWA & Offline** — service worker (`staff-sw.js`), manifest, iOS cache buster, standalone redirects.
14. **Stili vizual** — Premium Dark Luxury, `boulevard.css`, Playfair + Inter, SVG ikona 1.5px, glassmorphism.
15. **Skedarët kryesorë me role** — një tabelë kompakte "path → çfarë bën" për të gjithë skedarët në `src/` dhe `supabase/`.
16. **Njohuritë institucionale** — përmbledhje e memoriave (`mem://`) që ndikojnë çdo vendim (geofencing 75m i pezulluar, printer arka etj.).
17. **Pikat e njohura të kujdesit** — gjëra që lehtë prishen (RLS + GRANT, WidthType, offer time crossing midnight, kiosk-printing flags, iOS PWA cache) — që lexuesi të mos i propozojë sërish.
18. **Çfarë NUK është implementuar / është jashtë skopit** — printera të veçantë kuzhinë/bar, fallback offline i printimit, etj.

## Si do ta ndërtoj
- Do të kaloj shpejt nëpër: `src/App.tsx`, `src/pages/*`, `src/components/pos/*`, `src/lib/*`, `supabase/functions/*` (lista), `supabase/config.toml`, `DOKUMENTACIONI.md`, `STRUCTURE.md`, `public/manifest*`, dhe skema aktuale e DB-së.
- Do të bëj query të skemës së DB-së për tabelat + kolonat aktuale (jo vetëm hamendësim nga migrimet).
- Do të përmbledh, jo do të bëj copy-paste kodi të gjatë — snippet-e vetëm kur ndriçojnë llogjikën (p.sh. `activePrice` te `pos-create-order`).
- Gjuha: **shqip**, me terma teknikë në anglisht kur duhet.
- Objektivi i gjatësisë: ~1500–2500 rreshta, i strukturuar me tituj H2/H3 që të jetë i navigueshëm.

## Rezultati për ty
Në fund të punës do të kesh:
```
<presentation-artifact path="boulevard-technical-reference.md" mime_type="text/markdown"></presentation-artifact>
```
Mund ta hapësh/shkarkosh menjëherë dhe t'ia japësh kujtdo dëshiron për konsultim.

## Jashtë skopit
- Ndryshime në kod.
- Ekzekutim testesh apo browser automation.
- Dokumentim i çdo rreshti kodi — vetëm llogjika + arkitektura + pikat kritike.
