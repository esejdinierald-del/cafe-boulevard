## Qëllimi
Shfaq një **banner pulsues në krye të ekranit** te `/dashboard` sa herë ka porosi në pritje në Bar KDS, Kuzhina KDS, ose Thirrje & Porosi — pavarësisht tab-it aktiv, edhe nëse bileta është e fshehur nën tab tjetër.

## Sjellja
- Banner-i shfaqet sipër Tabs-list (poshtë header-it me QR/ora), gjerësi e plotë.
- Përmban ikonë zilje + tekst dinamik: `🔔 POROSI E RE — Bar (2) • Kuzhina (1) • Thirrje (0)` (fshin ato me 0).
- Klikimi mbi banner e çon operatorin te tab-i i parë me porosi (bar → kitchen → requests).
- Pulson vazhdimisht (background primary + shadow) derisa `barPending + kitchenPending + pendingRequests + pendingOrders === 0`.
- Fshihet automatikisht kur mbaron pritja ose kur `muteNotifications === true`.
- Nuk zëvendëson pulsimin ekzistues të tab-ave — plotëson atë.

## Ndryshimet teknike
Vetëm `src/pages/Dashboard.tsx`:

1. Llogarit `totalKdsPending = barPending + kitchenPending + pendingRequests.length + pendingOrders.length`.
2. Shto një `<button>` banner mbi `<Tabs>` (rreshti ~696), me:
   - `className="w-full mb-3 rounded-lg py-3 px-4 bg-primary text-primary-foreground font-bold text-lg animate-pulse shadow-lg shadow-primary/50 ring-2 ring-primary flex items-center justify-center gap-3"`
   - Render vetëm nëse `totalKdsPending > 0 && !muteNotifications`.
3. `onClick`: `setActiveTab(barPending > 0 ? "bar" : kitchenPending > 0 ? "kitchen" : "requests")`.
4. Tekst: `🔔 POROSI E RE` + copëza kondicionale për çdo zonë me numër > 0.

Asnjë ndryshim në backend, RLS, ose në KDSPanel/RequestsOrdersPanel.

## Jashtë qëllimit
- Tinguj shtesë (janë tashmë të konfiguruar në Dashboard).
- Njoftime web-push (ekziston `send-push`).
- Modifikim i logjikës së polling-ut (mbetet 4s).