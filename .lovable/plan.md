## Plan: POS System Integration

Do të zbatoj HAPAT A–C plotësisht nga brenda Lovable. Nuk ka asnjë hap që kërkon të hysh vetë në Supabase — migrationi dhe Edge Functions deployohen automatikisht nga këtu.

Po ashtu ka disa mospërputhje me kodin ekzistues që duhen zgjidhur para se komponentët POS të funksionojnë. I trajtoj më poshtë.

---

### HAPI A — Migration SQL

Ekzekutoj migrationin ashtu siç është, me këto **korrigjime të domosdoshme**:

1. **`menu_categories` nuk ekziston** në projektin tënd — tabela quhet `categories`. Do ta zbatoj `ALTER TABLE` mbi `categories` (shtoj `parent_id`, `icon`, `for_bar`, `for_kitchen`; `display_order` ekziston tashmë).
2. **Konflikt me tabelën `tables` ekzistuese**: ti tashmë ke `public.tables(id, number, name, qr_code, created_at, updated_at)` me 20 rreshta (Tavolina 1–20) të përdorura nga `get-table-name`. `CREATE TABLE IF NOT EXISTS` do ta anashkalojë krijimin, kështu që do të shtoj kolonat e reja (`capacity`, `status`, `location_id`) me `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, dhe **nuk do të futë** të dhënat fillestare 1–14 (do të mbetet konfigurimi yt aktual).
3. **GRANT statements**: shtoj `GRANT` për `authenticated` dhe `service_role` mbi çdo tabelë të re (kërkesë e Lovable Cloud / PostgREST — pa to tabelat nuk arrihen).
4. **Politika `allow_all` publike**: kjo lejon këdo në internet të lexojë/modifikojë porositë, transaksionet, stafin, inventarin. Do ta zbatoj siç e kërkove, por **ta di**: kjo është e pasigurt për prod. Rekomandim: më vonë ta ngushtojmë me RLS bazuar në `has_role()`.
5. Pjesa tjetër (raw_materials, supplies, transactions, pos_orders, order_items_split, staff_members, RPCs `verify_staff_pin`/`increment_material`/`add_supply`/`close_pos_order`, indexes, REPLICA IDENTITY, REVOKE mbi `pin_code`) zbatohen ashtu siç janë.

### HAPI B — 4 Edge Functions

Krijoj:
- `supabase/functions/pos-create-order/index.ts`
- `supabase/functions/pos-confirm-order/index.ts`
- `supabase/functions/pos-print-ticket/index.ts`
- `supabase/functions/pos-get-inventory/index.ts`

Kod-i ashtu siç e dhe. Deployohen automatikisht — **s'ke pse të bësh asgjë manuale**.

### HAPI C — 2 komponentë POS

**Problem**: skedarët `src/components/pos/MenuGrid.tsx` dhe `OrderPanel.tsx` nuk ekzistojnë ende, dhe importojnë module që gjithashtu nuk ekzistojnë:
- `@/hooks/use-pos`
- `@/hooks/use-auth`
- `@/stores/pos-store`
- `@/lib/supabase` (te ky projekt është `@/integrations/supabase/client`)

Po ashtu bllokun tuaj JSX i mungon markup-i (mesa duket u pastrua nga formatimi i mesazhit — mungojnë tag-e `<div>`, `<button>`, `<input>`, `<span>`, etj).

**Plani im për HAPIN C**: krijoj të dy skedarët POS ashtu siç dërguat, duke:
- korrigjuar `@/lib/supabase` → `@/integrations/supabase/client`,
- rindërtuar JSX-në e humbur bazuar në logjikën dhe klasat Tailwind që janë të dukshme,
- **shtuar stub-e minimale** për `use-pos`, `use-auth`, `pos-store` që të kompilohen (Zustand store bosh me `currentOrder`, `addItem`, `removeItem`, `updateItemNotes`, `submitOrder` që thërret edge function `pos-create-order`). Këto stub-e nuk lidhen ende me asnjë faqe/route — komponentët POS mbeten të pasistemuar derisa të më thuash ku t'i vendos (Dashboard, faqe e re `/pos`, etj).

Nëse ke tashmë një plan për arkitekturën POS (hooks/stores) ose preferon që ta shtyj HAPIN C derisa të ma dërgosh të plotë, më thuaj dhe e kaloj për momentin.

### HAPI D — Konfirmimi
Në fund të ndryshimeve, të kthej përmbledhje të plotë me çdo skedar të prekur dhe çdo problem të hasur.

---

### A duhet të bësh diçka vetë në Supabase?
**Jo.** Migrationi dhe Edge Functions bëhen të gjitha nga këtu. E vetmja gjë që do të kërkohet nga ti është të **aprovosh migrationin** kur të shfaqet dialog-u i Lovable Cloud.

---

### Pyetje kritike para se të filloj
1. **Politikat `allow_all`**: A i dëshiron vërtet publike (këdo mund të shohë/modifikojë porositë e POS)? Ose t'i ngushtoj me `has_role('manager' | 'admin')`?
2. **HAPI C stub-et**: OK me stub-e minimale `use-pos`/`use-auth`/`pos-store` që kodi të kompilohet, ose ta shtyj HAPIN C derisa të më dërgosh arkitekturën e plotë?
