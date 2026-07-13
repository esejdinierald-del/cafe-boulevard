# VulnGuard — Security Vulnerability Dashboard

Build a standalone route `/vulnguard` that renders a premium, dark-mode security dashboard using the provided scan JSON as static source data.

## Scope
- New page only. No backend, no DB, no auth changes. Existing cafe app untouched.
- All data lives in a local TS module (typed constants), so the dashboard is deterministic and offline.

## Route
- Add `/vulnguard` in `src/App.tsx` above the catch-all.

## Files to add
```
src/pages/VulnGuard.tsx                     # page shell + layout
src/data/vuln-scan.ts                       # typed scan data + derived stats
src/components/vulnguard/StatCard.tsx       # 4 KPI cards
src/components/vulnguard/SeverityDonut.tsx  # Recharts pie (High vs Moderate)
src/components/vulnguard/PerPackageBar.tsx  # Recharts bar
src/components/vulnguard/ScoreGauge.tsx     # radial gauge (Recharts RadialBar)
src/components/vulnguard/PackageTable.tsx   # search + tabs + expandable rows
src/components/vulnguard/Recommendations.tsx
src/components/vulnguard/CleanPackages.tsx  # collapsible grid
src/components/vulnguard/Header.tsx         # title + project id + export
```

## Data module
`src/data/vuln-scan.ts` exports:
- `scan` — the JSON verbatim, typed as `Scan`.
- `CLEAN_PACKAGES` — 55 placeholder names (derived from `package.json` dependency list minus the 4 vulnerable ones) so the clean grid is real.
- Derived helpers: `totals()`, `perPackageCounts()`, `severityCounts()`, `securityScore()`.

## Layout (VulnGuard.tsx)
```text
+------------------------------------------------------+
| Header: VulnGuard  |  Dependency Vulnerability Report|
|         projectId (truncated + copy)  [Export JSON]  |
+------------------------------------------------------+
| StatCard x4  (Total / Vulnerable / Vulns / High)     |
+---------------------+--------------------------------+
| SeverityDonut       | ScoreGauge (93.2%  grade A)    |
+---------------------+--------------------------------+
| PerPackageBar (full width)                           |
+------------------------------------------------------+
| Recommendations panel                                |
+------------------------------------------------------+
| PackageTable (search + [All|High|Moderate] tabs)     |
|   row click -> expand vuln list w/ ExternalLink      |
+------------------------------------------------------+
| CleanPackages (collapsible, grid of green chips)     |
+------------------------------------------------------+
```

## Visual system
- Background `bg-slate-950`, panels `bg-white/5 backdrop-blur border border-white/10 rounded-2xl`.
- Severity tokens: high `text-red-400 bg-red-500/15 border-red-500/30`, moderate `text-amber-300 bg-amber-500/15 border-amber-500/30`, clean `text-emerald-400 bg-emerald-500/15 border-emerald-500/30`.
- Typography: Inter (already loaded). Numeric KPIs `font-display` (Playfair) for a premium accent.
- Icons: `Shield`, `AlertTriangle`, `AlertOctagon`, `CheckCircle2`, `ExternalLink`, `Search`, `Filter`, `Copy`, `Download`, `ChevronDown` from `lucide-react`.
- Motion: `framer-motion` (already in deps) — stagger fade-in on cards, `AnimatePresence` for row expansion and clean-packages collapse.

## Interactivity details
- Search: controlled input, case-insensitive `includes` on package name.
- Severity tabs: `All | High | Moderate` filter rows by whether the package has ≥1 vuln of that severity (High tab surfaces packages with any high; Moderate surfaces packages with moderate — packages with both appear in both).
- Row expand: click row toggles a details region listing each vulnerability (name + severity pill + `ExternalLink` opening advisory in new tab with `rel="noreferrer noopener"`).
- Copy: click package name copies to clipboard via `navigator.clipboard.writeText`, toast via existing `sonner`.
- Export: button downloads `vulnerability-report.json` via `Blob` + anchor click.
- Sort: column headers on Package / Count toggle asc/desc.

## Charts (Recharts, already installed)
- Donut: `PieChart` with two slices (High 15, Moderate 11), inner radius for donut, center label total.
- Bar: `BarChart` horizontal, one bar per vulnerable package, color by dominant severity.
- Gauge: `RadialBarChart` single bar 0–100, stroke color derived from score threshold; center text `93.2%` and grade `A`.

## Recommendations panel
Static list built from the data:
1. `vite-plugin-pwa` — Critical, 18 vulns incl. RCE (serialize-javascript, babel).
2. `react-router-dom` — High, XSS via open redirect.
3. `recharts` — Moderate, lodash prototype pollution / template RCE.
4. `@supabase/supabase-js` — Moderate, ws DoS.

Each row: severity icon, package name, one-line reason, `Upgrade` chip (visual only).

## Responsiveness
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for KPIs.
- Charts stack on mobile, side-by-side ≥ `lg`.
- Table becomes a card list < `md` (hide count column, keep pill + expand).

## Out of scope
- No real npm audit hook, no writes, no changes to existing routes, styles, or memory rules. Existing cafe theming (`boulevard.css`) is not touched; VulnGuard uses its own local Tailwind classes.

## Verification
- `tsgo` typecheck on new files.
- Manual visual check at `/vulnguard` desktop + mobile viewport via Playwright screenshot.
