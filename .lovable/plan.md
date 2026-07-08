
# Lidhja e app-it të kamarierit me printerin e PC-së

## Ideja bazë

Nuk mund të printojmë direkt nga celulari në printerin e PC-së — celulari dhe printeri nuk "flasin" me njëri-tjetrin. Zgjidhja: bëjmë PC-në "printer server" përmes vetë dashboard-it. Celulari dërgon biletën në një radhë në renë (Lovable Cloud), PC-ja që e ka dashboard-in hapur me shortcut-in special e sheh menjëherë dhe e printon.

```text
[Celular kamarieri]  --insert print_job-->  [Lovable Cloud DB]
                                                    |
                                          Realtime push (<1s)
                                                    v
                                        [PC arka: /print-station]
                                                    |
                                             window.print()
                                                    v
                                            [Printeri 80mm]
```

## Ndryshimet për përdoruesin

### Kamarieri (celular)
- Kur mbyll tavolinën, në vend të dritares së printimit që s'funksionon në cel, sheh vetëm një konfirmim: **"Bileta u dërgua tek arka ✓"**.
- Nëse PC-ja s'është online, sheh **"Në pritje printimi (1)"** me një ikonë të verdhë deri sa PC ta pranojë.
- Butoni "Riprovo printim" për çdo bilet të mbetur në pritje.

### Arka (PC me printer)
- Hapet dashboard-i normalisht dhe një tab i ri: **`/print-station`**.
- Sapo vjen një bilet e re, printohet automatikisht pa dialog (silent print).
- Në ekran shihet një listë e biletave të fundit (kohë, tavolinë, kamarier, status).
- Butonë manualë: "Riprint" dhe "Shëno si printuar".

### Konfigurim një herë në PC
Krijoni një shortcut të Chrome-it me këto flamurë:

```text
chrome.exe --kiosk-printing --app=https://cafe-boulevard.lovable.app/print-station
```

Kaq mjafton — Chrome pranon `window.print()` pa treguar dialog dhe e dërgon direkt te printeri default. Print-station ruan sesionin, ndaj s'ka rilogin.

## Pjesa teknike

### 1. Tabela e re `print_jobs` (Lovable Cloud)
```sql
create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  station text not null default 'arka',          -- 'arka' | 'kuzhina' | 'bar'
  kind text not null,                            -- 'close_table' | 'order' | 'kitchen' | 'bar'
  title text,                                    -- p.sh. "Tavolina 4 · Mbyllje"
  receipt_html text not null,                    -- HTML tashmë i formatuar (80mm)
  status text not null default 'pending',        -- 'pending' | 'printing' | 'printed' | 'failed'
  created_by text,
  table_code text,
  amount numeric,
  created_at timestamptz not null default now(),
  printed_at timestamptz,
  attempts int not null default 0
);
```
+ GRANT + RLS (staff mund të INSERT/SELECT/UPDATE vetëm rreshtat e tyre; admin gjithçka) + realtime enable.

### 2. Ndryshim në `receipt-print.ts` / mbyllja e tavolinës
- Aktualisht mbyllja telefonon `printReceiptInline(...)` → dritare.
- E ndryshojmë të thërrasë funksion të ri `queuePrintJob({ kind, title, html, ... })` që bën vetëm `insert` në `print_jobs`.
- Në desktop (dashboard PC) e mbajmë opsionin ekzistues të printimit lokal aktiv si më parë (për rastet e printimit të përgjithshëm nga arka).
- Zbulimi mobile vs desktop përmes `matchMedia('(pointer: coarse)')` ose flag në URL.

### 3. Faqe e re `/print-station`
- Route publik brenda `PWAAuthGate` (kërkon staff të loguar në PC).
- Subscribe Realtime në `print_jobs where status='pending' and station='arka'`.
- Për çdo job të ri:
  1. Update `status='printing'`, `attempts+=1`.
  2. Injekton `receipt_html` te `#boulevard-print-area`.
  3. Aplikon auto-fit ekzistues, thërret `window.print()`.
  4. Update `status='printed'`, `printed_at=now()`.
- UI: listë e fundit 20 biletave me kohë + buton "Riprint".
- Beep + pulsim ari kur vjen bileta e re (si te kitchen).

### 4. Indikatori te celulari
- Në `POS.tsx` (ose komponenti i mbylljes) query të vogël realtime: `count(*) where status='pending' and created_by=me`.
- Badge "Në pritje: N" me ngjyrë të verdhë; kur bëhet 0 kthehet blu "OK".

### 5. Retry & shëndeti
- Nëse `attempts >= 3` → status='failed'; shfaqet në print-station me sfond të kuq dhe buton "Riprovo".
- Edge function `printer-heartbeat` opsional (mund ta shtojmë më vonë) — për tani mjafton badge-i.

## Skedarët që preken
- `supabase/migrations/*_print_jobs.sql` — tabela + RLS + realtime.
- `src/lib/print-queue.ts` — funksion i ri `queuePrintJob`.
- `src/lib/receipt-print.ts` — helper që kthen HTML-në e biletës si string (pa printuar).
- `src/pages/PrintStation.tsx` — faqja e re.
- `src/App.tsx` — route `/print-station`.
- `src/pages/POS.tsx` / komponentët e mbylljes së tavolinës — thirrja e re `queuePrintJob` në vend të `printReceiptInline` kur jemi në mobile.
- `src/components/pos/POSPanels.tsx` — badge "në pritje".

## Jashtë këtij plani (mund t'i shtojmë më vonë)
- Printera të veçantë për kuzhinën/barin (u konfirmua: vetëm 1 printer tani).
- Fallback lokal në cel (u konfirmua: rri në pritje).
- Aplikacion native "print bridge" për Windows (nuk nevojitet me `--kiosk-printing`).
