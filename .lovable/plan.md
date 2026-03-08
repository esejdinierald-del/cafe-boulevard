

## Plani: Aktivizo kerkimin ne web per asistentin virtual

### Cfare do te ndryshoje

Modeli `google/gemini-2.5-flash` qe perdoret aktualisht do te zevendesohet me `google/gemini-2.5-flash` me opsionin `web_search_options` te aktivizuar. Kjo i lejon modelit Gemini te kerkoj ne Google automatikisht kur pyetja e klientit kerkon informacion te jashtem (lajme, moti, ngjarje, etj.).

### Ndryshimet teknike

**File: `supabase/functions/staff-chat/index.ts`**

1. Shto `web_search_options: { search_context_size: "low" }` ne body te kerkeses drejt Lovable AI Gateway (kjo aktivizon Google Search grounding per modelin Gemini)
2. Perditeso system prompt qe t'i thote AI-se: "Nese klienti pyet per dicka qe nuk e di (lajme, moti, ngjarje, info te pergjithshme), kerkoji ne web dhe pergjigju me te dhena te sakta"

### Avantazhet
- Pa kosto shtese (perdor modelin ekzistues Gemini)
- AI-ja kerkon automatikisht ne Google kur nuk ka pergjigje nga konteksti lokal
- Funksionon per cdo lloj pyetjeje: moti, lajme, informacione te pergjithshme

### Kufizimet
- Varet nga mbeshtetja e gateway-t per `web_search_options` - nese nuk mbeshtetet, do te perdorim tool calling me nje funksion kerkimi

