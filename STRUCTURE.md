# Boulevard Café — Project Structure

## Entry Points
- `index.html` — root HTML, loads Vite/React
- `src/main.tsx` — React root mount
- `src/App.tsx` — router setup (BrowserRouter + all routes)
- `src/index.css` — global CSS reset + Tailwind base
- `src/styles/boulevard.css` — custom Boulevard brand styles

## Routes & Pages
| Route | File | Who uses it |
|---|---|---|
| `/` | `src/pages/Index.tsx` | Customer — call waiter, request bill |
| `/menu` | `src/pages/Menu.tsx` | Customer — browse menu, place order |
| `/dashboard` | `src/pages/Dashboard.tsx` | Staff — real-time requests (passcode: 2025) |
| `/staff` | `src/pages/StaffShift.tsx` | Staff — PWA with shift token auth |
| `/manager-login` | `src/pages/ManagerLogin.tsx` | Manager — Supabase auth login |
| `/manager` | `src/pages/ManagerDashboard.tsx` | Manager — menu mgmt, offers, AI knowledge |
| `/install` | `src/pages/Install.tsx` | All — PWA install instructions |
| `/dokumentacion` | `src/pages/AppDocumentation.tsx` | Internal — app docs |

## Key Components
- `src/components/StaffChatDialog.tsx` — AI chat powered by staff-chat Edge Function
- `src/components/FeedbackDialog.tsx` — customer feedback form
- `src/components/TableIdentifier.tsx` — reads table number from URL param
- `src/components/WelcomeGreeting.tsx` — animated greeting on Index page
- `src/components/QrScanner.tsx` — QR code scanner for table detection
- `src/components/SplashScreen.tsx` — PWA splash on load

## Custom Hooks
- `use-chat-session.ts` — manages AI chat session state
- `use-geolocation.ts` — geolocation for table detection
- `use-language.tsx` — language toggle (Albanian / English)
- `use-mobile.tsx` — responsive breakpoint detection

## Supabase Integration
- `src/integrations/supabase/client.ts` — Supabase client init
- `src/integrations/supabase/types.ts` — auto-generated DB types

## Edge Functions (supabase/functions/)
| Function | Purpose |
|---|---|
| `staff-chat` | AI chat for staff (Gemini via LOVABLE_API_KEY), uses ai_knowledge table |
| `manage-shift` | Create / extend / close staff shift tokens |
| `validate-shift` | Validate a shift token is active |
| `unlock-shift` | Manager unlocks a shift (override) |
| `complete-request` | Mark a service_request as completed + send push |
| `send-push` | Send Web Push notification to subscribed staff |
| `push-subscribe` | Save a push subscription to push_subscriptions table |
| `cleanup-chat-sessions` | Delete expired chat sessions (cron) |

## Database Tables
| Table | Purpose |
|---|---|
| `categories` | Menu categories (name, name_en, display_order) |
| `menu_items` | Menu products (name, price, image_url, available, bilingual) |
| `orders` | Customer orders (items jsonb, total_price, status, table_number) |
| `service_requests` | Waiter/bill calls from customers (pending → completed) |
| `chat_sessions` | Active AI chat sessions per table |
| `shift_tokens` | Staff shift auth tokens (active/expired) |
| `ai_knowledge` | Custom knowledge base for staff AI chat |
| `feedback` | Customer feedback submissions |
| `push_subscriptions` | Web Push endpoint/key storage per staff device |
| `user_roles` | Manager/admin role assignments |
| `table_devices` | Registered table devices |

## Storage Buckets
- `menu-images` (public) — product images served at /storage/v1/object/public/menu-images/

## PWA
- `public/manifest.webmanifest` — customer PWA manifest
- `public/staff-manifest.webmanifest` — staff PWA manifest
- `public/staff-sw.js` — staff service worker (push notifications)
- `public/pwa-192x192.png` / `pwa-512x512.png` — PWA icons

## QR Codes
- `public/qr-codes/table-1.svg` through `table-4.svg` — print-ready QR codes per table

## Migrations (chronological)
| File | What it does |
|---|---|
| `20251206001705_remix_migration_from_pg_dump.sql` | Initial schema: categories, menu_items, orders, service_requests, table_devices, user_roles, RLS policies, manager functions |
| `20260128100156_...sql` | Minor RLS adjustment |
| `20260204232224_...sql` | Trigger: auto-assign manager role on signup for known emails |
| `20260308051348_...sql` | Add chat_sessions table for AI chat |
| `20260308141301_...sql` | Add shift_tokens table for staff shift auth |
| `20260314060004_...sql` | Staff RLS policies for orders |
| `20260314060116_...sql` | Fix: allow anyone to update orders |
| `20260321052040_...sql` | Add update policy for shift_tokens |
| `20260321055419_...sql` | Managers can delete chat sessions |
| `20260321060442_...sql` | Minor RLS fix |
| `20260321062752_...sql` | Consolidated RLS: service_requests, shift_tokens, storage bucket policies |
| `20260321070936_...sql` | Minor cleanup |
| `20260321075640_...sql` | Add ai_knowledge table for staff AI context |
| `20260321222516_...sql` | Add feedback table for customer feedback |
| `20260325145856_...sql` | Minor fix |
| `20260325185704_...sql` | Minor fix |
| `20260404225731_...sql` | Minor fix |
| `20260405010635_...sql` | Minor fix |
| `20260405030440_...sql` | Revised RLS for shift_tokens, service_requests, storage (manager permissions) |
| `20260407032651_...sql` | Add push_subscriptions table for Web Push |
| `20260508004736_...sql` | Latest patch |

## User Flows

### Customer Flow
1. Scans QR code at table → opens `/` with `?table=N` param
2. Sees welcome greeting + 3 buttons: Call Waiter / Request Bill / View Menu
3. **Call Waiter / Request Bill** → inserts into `service_requests` → staff gets push notification
4. **View Menu** → `/menu` → browses categories → adds items → confirms order → inserts into `orders`
5. Optionally submits feedback via FeedbackDialog

### Staff Flow (PWA)
1. Manager creates shift via `/manager` → generates `shift_tokens` entry
2. Staff opens `/staff` → enters shift token → validated by `validate-shift` Edge Function
3. Staff sees live `service_requests` via Supabase realtime subscription
4. Staff marks requests complete → `complete-request` Edge Function fires, sends push to other devices
5. Staff can open StaffChatDialog → AI assistant powered by `staff-chat` + `ai_knowledge`

### Manager Flow
1. Logs in at `/manager-login` with Supabase auth (email: menuonline483@gmail.com)
2. Manager Dashboard: add/edit/delete categories and menu_items, upload images to `menu-images` bucket
3. Manage staff shifts: create/extend/unlock tokens via `manage-shift` / `unlock-shift`
4. Manage AI knowledge base: add context entries to `ai_knowledge` for staff chat
5. View feedback and service request history

## Environment Variables
| Variable | Used by |
|---|---|
| `VITE_SUPABASE_URL` | Frontend Supabase client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend Supabase client (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | Frontend project reference |
| `SUPABASE_URL` | Edge Functions (auto-injected by Supabase) |
| `SUPABASE_PUBLISHABLE_KEY` | Edge Functions (anon key, auto-injected) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | send-push Edge Function (Web Push) |
| `LOVABLE_API_KEY` | staff-chat Edge Function (Gemini AI gateway) |
