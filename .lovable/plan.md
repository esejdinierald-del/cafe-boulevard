
# Plan: Menaxhim Produktesh & Mbyllja T1 me Shiriti Auto

## Qëllimi
Në `/regjistrimi-ditor`:
1. Menaxhim i plotë i produkteve (shto / fshi / **riemërto** + **mapim me menu items**).
2. Buton i ri **"Mbyll T1"** që lexon shitjet e T1 nga `transactions`, mbush automatikisht `Shiriti` për çdo produkt, dhe propagon `StokFillim` për T2 (njësoj si mbyllja e ditës).

---

## 1. Backend (Migration)

Shtim kolonash te `inv_products`:
- `menu_item_ids uuid[] not null default '{}'` — lista e artikujve të menusë që konsumohen nga ky produkt inventari.
- `units_per_sale numeric not null default 1` — sa njësi të inventarit shpenzohen për 1 shitje (p.sh. 1 shishe birrë = 1).

Shtim kolone te `inv_daily_entries`:
- `turn1_closed_at timestamptz null` — koha kur u mbyll T1 (kufiri i turneve).

Politikat RLS ekzistuese vlejnë (autenticated read/write) — s'duhet gjë e re.

---

## 2. UI: Menaxhimi i Produkteve

Zëvendëso rreshtin "Shto produkt" me një dialog **"Menaxho produktet"** (butoni hapet nga header i seksionit Produktet):

- Listë e produkteve me:
  - Input për riemërtim (auto-save on blur).
  - Multi-select (checkbox list e kërkueshme) e `menu_items` për `menu_item_ids`.
  - Input numerik për `units_per_sale`.
  - Buton fshi (me konfirmim).
- Rresht i ri "Shto produkt" (emri + zgjedhja e menu items në momentin e krijimit).

**Sinkronizimi T1/T2 pas riemërtimit:** kur ndryshon emri, migro çelësin brenda `turn1_data.products` dhe `turn2_data.products` (rewrite objektin me çelës të ri, ruaj në DB).

## 3. Mbyllja e Turnit 1 — Shiriti Auto

Buton i ri **"Mbyll Turnin 1"** në tab-in T1 (afër "Mbyll ditën"):

Rrjedha:
1. Konfirmo veprimin.
2. Merr `turn1_closed_at` = tani (Europe/Rome). Nëse `inv_daily_entries.turn1_closed_at` është e mbushur → mos rilogariti (paralajmëro).
3. Query te `transactions`:
   - `type = 'sale'`
   - `created_at >= <fillim i ditës Rome>` **dhe** `created_at < turn1_closed_at`
4. Për çdo transaksion, kalo nëpër `items` (JSONB) dhe grupo sasitë sipas `menu_item_id`.
5. Për çdo `inv_product`, `Shiriti T1 += Σ(sold_qty[menu_item_id] * units_per_sale)` për të gjithë `menu_item_ids` të tij.
6. Përditëso `turn1_data.products[name].shiriti` në DB.
7. Ruaj `turn1_closed_at`.
8. Auto-propagimi T1→T2.stokFillim që ekziston tashmë do të rifreskojë "Stok Fillim" të T2 me formulën aktuale (stokFillim + furnizime + shiriti − gjendje... siç është në `InventoryCalculationService.calculateStockForNextTurn`).

**Ndarja e turneve për mbylljen e ditës:** kur klikohet "Mbyll ditën", `Shiriti T2` llogaritet nga transactions me `created_at >= turn1_closed_at` deri në momentin e mbylljes. E njëjta logjikë, riciklohet.

## 4. Shërbimi i ri: `inventorySalesAggregation.service.ts`

Metodë e re (pa prekur shërbimet ekzistuese):
```ts
aggregateSalesByProduct(fromISO, toISO, products): Promise<Record<productName, number>>
```
- Merr `transactions` në interval.
- Ndërton hartë `menu_item_id → total_qty`.
- Kthen `productName → shiriti` sipas `menu_item_ids` × `units_per_sale`.

## 5. Ndryshime specifike

**Files të prekur:**
- **Migration i ri:** shto kolonat te `inv_products` dhe `inv_daily_entries`.
- **`src/types/inventory.types.ts`** — shto `menu_item_ids`, `units_per_sale` te tipi `InvProduct` (te faqja) dhe interface e re nëse duhet.
- **`src/pages/RegjistrimiDitor.tsx`**:
  - Zëvendëso rreshtin "Shto produkt" me dialog `ProductManagerDialog`.
  - Shto butonin "Mbyll Turnin 1".
  - Kur riemërton, migro çelësat në T1/T2 dhe ruaj.
- **`src/components/inventory/ProductManagerDialog.tsx`** (i ri) — CRUD dhe multi-select menu items.
- **`src/services/inventorySalesAggregation.service.ts`** (i ri).
- **`src/integrations/supabase/types.ts`** — regjenerohet automatikisht pas migrimit.

## 6. Jashtë fushës (nuk preket)
- `InventoryCalculationService` dhe `InventoryStockPropagationService` — s'ndryshohen.
- `/inventory` (materialet POS) — s'preket.
- Sjellja e "Furnizime" mbetet e pavarur (siç kërkuar më parë).

---

## Pika për konfirmim
Nëse dakord, do të filloj me migrimin, pastaj UI & shërbimi.
