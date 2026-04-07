

## Plani: Faqja /staff e pavarur — njoftimet funksionojnë pa instalim PWA

### Problemi
Faqja `/staff` nuk instalohet si PWA në shumë pajisje (sidomos iOS Safari). Pa instalim, njoftimet me zë dhe vibrim nuk funksionojnë kur telefoni është i bllokuar ose tab-i është në sfond.

### Zgjidhja: Web Push Notifications me Service Worker

Kjo është mënyra e vetme që funksionon pa instaluar PWA-në — **Push API + Service Worker** mund të zgjojnë telefonin edhe kur browser-i është i mbyllur (në Android; iOS 16.4+ me Safari).

### Hapat

**1. Krijo një service worker të dedikuar për staff push notifications**
- File: `public/staff-sw.js`
- Regjistron veten për push events
- Kur merr push event, luan tingull alarm, shfaq notification me vibrim
- Përdor `self.registration.showNotification()` që funksionon edhe kur tab-i është i mbyllur

**2. Krijo endpoint për Web Push subscription (Edge Function)**
- File: `supabase/functions/push-subscribe/index.ts`
- Merr subscription object nga browser-i dhe e ruan në DB
- Tabelë e re: `push_subscriptions` (endpoint, p256dh, auth, shift_token)

**3. Krijo endpoint për dërgimin e push notifications (Edge Function)**
- File: `supabase/functions/send-push/index.ts`
- Kur vjen kërkesë e re (service_request/order INSERT), dërgon web-push te të gjitha pajisjet e regjistruara
- Përdor `web-push` library ose raw Web Push Protocol

**4. Përditëso StaffShift.tsx**
- Regjistro service worker-in `staff-sw.js` kur hapet faqja
- Kërko leje për notifications
- Dërgo subscription te edge function `/push-subscribe`
- Hiq varësinë nga PWA install — njoftimet funksionojnë direkt nga browser

**5. Krijo tabelën push_subscriptions**
```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  shift_token text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
```

**6. Gjenero VAPID keys (secret)**
- Kërkohen çelësa VAPID (public + private) për Web Push Protocol
- Public key përdoret në frontend, private key në edge function
- Ruhen si secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### Kufizime
- **iOS Safari**: Web Push funksionon vetëm në iOS 16.4+ dhe vetëm kur faqja shtohet në Home Screen (Add to Home Screen) — pa nevojë për manifest PWA të plotë, mjafton `display: standalone`
- **Android Chrome**: Funksionon pa problem edhe pa instalim PWA

### Alternativë më e thjeshtë (pa Web Push)
Nëse nuk duam kompleksitetin e Web Push, mund të përdorim:
- **Wake Lock API** + audio loop i heshtur në sfond — mban tab-in aktiv
- **Persistent notification sound** që riluhet çdo 3 sekonda kur ka kërkesë aktive
- Kjo funksionon vetëm kur tab-i është i hapur (jo kur telefoni bllkohet)

### Rekomandimi
Fillojmë me **alternativën e thjeshtë** (Wake Lock + audio loop) sepse implementohet shpejt dhe mbulon rastin kryesor (stafi e mban telefonin hapur gjatë turnit). Web Push mund të shtohet më vonë si shtresë shtesë.

