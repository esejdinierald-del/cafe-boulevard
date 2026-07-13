# Boulevard Café — Architecture

## Stack
- **Frontend:** React 18 + Vite 5 + TypeScript, Tailwind + shadcn/ui.
- **Backend:** Lovable Cloud (Postgres, Auth, Realtime, Edge Functions, Storage).
- **PWA:** Service Worker + Web Push (VAPID).

## Modules
| Route | Rol | Përshkrim |
|-------|-----|-----------|
| `/` | Klient | Menu QR + kërkesa shërbimi. |
| `/dashboard` | Banaku/KDS | Konfirmim + printim porosish. |
| `/pos` | Kamarier | Menaxhim tavolinash + porosi. |
| `/staff` | Kamarier | Login PIN + QR splash. |
| `/inventory` | Menaxher | Materialet + furnizime + alerte. |
| `/regjistrimi-ditor` | Kamarier/Menaxher | Regjistrim T1/T2. |
| `/analytics` | Menaxher | Xhiro 30-ditore + top produkte. |
| `/porosi-furnitor` | Menaxher | Porosi drejtuar furnitorëve. |
| `/manager` | Menaxher | CRUD kategori/artikuj/staf. |
| `/print-station` | PC | Radha e printimit cloud. |

## Data Flow
1. Porosi → `pos_orders`.
2. Konfirmim banaku → `pos-confirm-order` → dekrementim `raw_materials` sipas `recipes` + `transactions` sale + `print_jobs`.
3. `/print-station` konsumon `print_jobs`.
4. Regjistrimi Ditor → `shift_turns` (SoT).
5. Alertet: `raw_materials.quantity ≤ min_threshold`.

## Siguri
- RLS aktive kudo. Fshirje = admin only.
- Role te `user_roles` (enum `app_role`).
- Trigger `audit_row_change()` → `audit_log` për 8 tabela.
