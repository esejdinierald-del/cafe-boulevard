# Zhvillim Lokal

## Setup
1. `npm install`
2. `.env` gjenerohet nga Lovable Cloud
3. `npm run dev` → http://localhost:8080

## Test
- `npx vitest run`
- Config: `vitest.config.ts` + `src/test/setup.ts`

## Migrime
- Miratohen përmes Lovable-it
- Çdo `CREATE TABLE public.*` shoqërohet me `GRANT`
- RLS gjithmonë e aktivizuar

## Konventa
- Asnjë `as any`
- Token semantik për ngjyra
- Playfair Display + Inter
- Vlerat: **Lekë**, zona kohore **Europe/Rome**
