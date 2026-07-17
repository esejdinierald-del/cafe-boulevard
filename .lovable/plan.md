# Fix: Staf nuk logohet dot (React error #310 te /pos)

## Shkaku
Në `src/pages/POS.tsx`:
- Rreshti **123**: `if (checking) return <...>;` (early return)
- Rreshti **132**: `const [hasServiceAlert, setHasServiceAlert] = useState(false);`
- Rreshti **135**: `useEffect(() => { ... }, [checking]);`

Këto dy hook-e janë **pas** early return. Në renderin e parë (`checking=true`) React sheh N hook-e; pas login-it (`checking=false`) sheh N+2 hook-e → React hedh **error #310** dhe ErrorBoundary shfaq "Diçka nuk shkoi mirë". Prandaj login-i i stafit "duket" i prishur — tokeni ruhet, por navigimi te `/pos` crash-on.

`/regjistrimi-ditor` ka të njëjtin simptomë sepse edhe atje kalohet pas login-it; nëse ndjek një pattern të ngjashëm do të verifikohet dhe rregullohet po ashtu.

## Ndryshimet

### 1) `src/pages/POS.tsx` — zhvendos hook-et lart
- Ngjit deklarimin `const [hasServiceAlert, setHasServiceAlert] = useState(false);` te blloku i state-eve në krye (afër rreshtit 51).
- Zhvendos `useEffect`-in për `service_requests` (rreshti 135-172) **para** `if (checking) return`, pikërisht menjëherë pas `useEffect`-it që ngarkon tavolinat (rreshti 90-121). Mbaj të njëjtin dependency `[checking]` dhe early-return brenda `useEffect` me `if (checking) return;` — kjo është e ligjshme.
- Rendi përfundimtar: të gjitha `useState`/`useEffect`/`useCallback` në krye → pastaj `if (checking) return ...` → pastaj JSX-i kryesor.

### 2) Verifikim i `RegjistrimiDitor.tsx`
- Kontroll i shpejtë që asnjë hook të mos jetë pas një `return` të kushtëzuar. Nëse ka, aplikohet i njëjti rregullim.

### 3) Verifikim
- Build + një lundrim: staff PIN login → `/pos` (nuk duhet të dalë ErrorBoundary) → `/regjistrimi-ditor`.
- Kontrolli i console për "#310" duhet të mos dalë.

## Skedarë të prekur
- `src/pages/POS.tsx` (rregullim i renditjes së hook-eve)
- `src/pages/RegjistrimiDitor.tsx` (vetëm nëse verifikimi zbulon të njëjtin pattern)

Asnjë ndryshim në logjikë, në DB apo në edge functions.
