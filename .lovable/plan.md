## 1) Siguri RLS — heq `allow_all`, mban lexim publik

Migration i ri që zëvendëson politikat `allow_all` me politika të ngushta. Të gjitha shkrimet kalojnë vetëm përmes Edge Functions (service_role), që i anashkalojnë RLS-në.

**Për çdo tabelë:**

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `pos_orders` | public | ❌ | ❌ | ❌ |
| `order_items_split` | public | ❌ | ❌ | ❌ |
| `transactions` | public | ❌ | ❌ | ❌ |
| `raw_materials` | public | ❌ | ❌ (vetëm RPC `add_supply`/`increment_material`) | ❌ |
| `supplies` | public | ❌ | ❌ | ❌ |
| `staff_members` | ❌ (as `pin_code`, as lista) | ❌ | ❌ | ❌ |
| `tables` | tashmë e saktë (SELECT public, mutations vetëm manager) — nuk preket |

**Shënime teknike:**
- `DROP POLICY allow_all` mbi 6 tabelat, pastaj `CREATE POLICY ... FOR SELECT USING (true)` ku nevojitet.
- `staff_members` mbetet pa asnjë policy publike → anon/authenticated nuk e prekin dot; verifikimi bëhet vetëm përmes RPC `verify_staff_pin` (SECURITY DEFINER, ekziston).
- `REVOKE INSERT, UPDATE, DELETE` mbi këto tabela nga `anon` dhe `authenticated`, mbaj `GRANT SELECT` ku duhet. `service_role` mban `ALL`.
- Nuk përdor `has_role()` — kamarierët nuk kanë sesion Supabase.

**Kontroll: a thyhet ndonjë faqe ekzistuese?**
Bëra grep në kodin frontend për shkrime direkte mbi këto tabela. Faqet ekzistuese (Dashboard, ManagerDashboard, Menu, Index, StaffShift) nuk bëjnë INSERT/UPDATE/DELETE direkt mbi `pos_orders`, `order_items_split`, `transactions`, `supplies`, `staff_members`, `raw_materials` — këto janë tabela të reja të POS. Nëse dalin gabime pas migrationit, do t'i raportoj për rregullim.

## 2) Route i ri `/pos` (i mbrojtur me PIN staff)

**Gating:** Ripërdor `shift_token` nga `localStorage` (njësoj si `/staff`). Nëse mungon → redirect te `/staff`.

**Layout 3-kolonësh (desktop, tablet-first):**

```text
┌──────────┬────────────────────┬──────────┐
│ Tavolinat│     MenuGrid       │OrderPanel│
│  (list)  │   (produktet)      │ (shporta)│
│  1  2  3 │                    │          │
│  🟢 🔴 🟢│                    │          │
└──────────┴────────────────────┴──────────┘
```

**Sjellja:**
- Kolona majtas: `useEffect` merr `tables` (SELECT public), realtime subscribe në `pos_orders` për të rifreskuar statusin (green=`available`, red=`occupied`).
- Klik mbi tavolinë të lirë → `startOrder("table", table.number)` → MenuGrid & OrderPanel fillojnë punën me atë porosi.
- Klik mbi tavolinë të zënë → shfaq porosinë ekzistuese `open` në OrderPanel (mund të shtohen artikuj/dërgohet përsëri).
- Pas `submitOrder` të suksesshëm, `pos-create-order` e vë tavolinën `occupied`; UI rifreskohet nga realtime.
- Buton "Modaliteti Banak" për porosi pa tavolinë (`startOrder("bar", null)`).

**Route:**
- `/pos` shtohet në `src/App.tsx` para catch-all.
- Faqja `src/pages/POS.tsx`: kontrollon `localStorage.shift_token` dhe `validate-shift` (opsional, në boot); nëse invalid → `navigate("/staff")`.

## Skedarët e prekur

**Krijim:**
- `supabase/migrations/<ts>_pos_rls_hardening.sql`
- `src/pages/POS.tsx`

**Modifikim:**
- `src/App.tsx` (route `/pos`)

## Pyetje t\u00eb hapura
Asnjë — vazhdojmë me `/pos` + shift_token gating. Nëse ndonjë faqe prishet pas migrationit, do të raportoj konkretisht dhe do rregullojmë veç e veç.