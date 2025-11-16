# Tuya Proxy me Fixie - Udhëzues Vendosje (Setup Guide)

## Problemi

Supabase Edge Functions nuk mbështesin proxy HTTP direkt, kështu që ne nuk mund të përdorim Fixie direkt nga Edge Functions. Zgjidhja është të vendosim një proxy server të personalizuar që përdor Fixie për të bërë kërkesa te Tuya API.

## Zgjidhja

Vendosni `tuya-proxy-with-fixie.js` në një hosting Node.js (si Railway, Heroku, DigitalOcean, etj.) që do të përdorë Fixie proxy për të komunikuar me Tuya API.

## Hapat për Vendosje

### 1. Zgjidhni një Hosting Provider

**Opsioni 1: Railway (Rekomanduar - Falas)**
- Regjistrohuni në https://railway.app
- Ka plan falas me $5 credit çdo muaj
- Deploy i shpejtë me GitHub

**Opsioni 2: Heroku**
- Regjistrohuni në https://heroku.com
- Ka plan falas me disa kufizime
- Deploy i thjeshtë me Git

**Opsioni 3: DigitalOcean App Platform**
- Më i shtrenjtë por më fleksibël
- Çmimet fillojnë nga $5/muaj

### 2. Deploy në Railway (Shembulli më i lehtë)

```bash
# 1. Instaloni Railway CLI
npm install -g @railway/cli

# 2. Krijoni një direktori të re
mkdir tuya-proxy
cd tuya-proxy

# 3. Kopjoni file-in
# Kopjoni tuya-proxy-with-fixie.js në këtë folder

# 4. Krijoni package.json
cat > package.json << 'EOF'
{
  "name": "tuya-proxy",
  "version": "1.0.0",
  "main": "tuya-proxy-with-fixie.js",
  "scripts": {
    "start": "node tuya-proxy-with-fixie.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

# 5. Inicializoni Railway project
railway login
railway init

# 6. Vendosni environment variables
railway variables set TUYA_CLIENT_ID=your_client_id
railway variables set TUYA_CLIENT_SECRET=your_client_secret
railway variables set PROXY_SECRET=your_strong_secret
railway variables set FIXIE_URL=http://fixie:eqamt9YShsE0vwj@ventoux.usefixie.com:80
railway variables set PORT=3000

# 7. Deploy
railway up
```

### 3. Merrni URL-në e Proxy

Pas deploy, Railway do t'ju japë një URL si:
```
https://your-app.up.railway.app
```

### 4. Testoni Proxy

```bash
# Test health endpoint
curl https://your-app.up.railway.app/health

# Duhet të kthejë:
{
  "status": "ok",
  "fixieConfigured": true,
  "timestamp": "..."
}
```

### 5. Konfiguroni Lovable

Në Lovable, shtoni këto secrets:

1. **TUYA_PROXY_URL**: `https://your-app.up.railway.app`
2. **TUYA_PROXY_SECRET**: E njëjta vlerë si `PROXY_SECRET` që vendosët në Railway

### 6. Testoni nga Dashboard

1. Shkoni te `/dashboard` (password: 2025)
2. Klikoni në njërin nga butonat "Tavolina 1-4"
3. Duhet të shihni "Ngrohësja u ndez!"

## Environment Variables

### Për Proxy Server (Railway/Heroku)

| Variable | Përshkrim | Shembull |
|----------|-----------|----------|
| `TUYA_CLIENT_ID` | Smart Life Client ID | `xxx` |
| `TUYA_CLIENT_SECRET` | Smart Life Client Secret | `xxx` |
| `PROXY_SECRET` | Secret për autentifikim | `my-strong-secret-123` |
| `FIXIE_URL` | Fixie proxy URL | `http://fixie:password@ventoux.usefixie.com:80` |
| `PORT` | Port për server | `3000` |

### Për Lovable (Secrets)

| Secret Name | Përshkrim |
|-------------|-----------|
| `TUYA_PROXY_URL` | URL e proxy server (p.sh. `https://your-app.up.railway.app`) |
| `TUYA_PROXY_SECRET` | E njëjta vlerë si `PROXY_SECRET` |

## Troubleshooting

### 1. "Proxy server not configured"

- Sigurohuni që `TUYA_PROXY_URL` është vendosur në Lovable secrets
- Testoni që proxy server është duke u ekzekutuar: `curl https://your-app.up.railway.app/health`

### 2. "Unauthorized"

- Sigurohuni që `TUYA_PROXY_SECRET` në Lovable përputhet me `PROXY_SECRET` në proxy server

### 3. "sign invalid" nga Tuya

- Kontrolloni që `TUYA_CLIENT_ID` dhe `TUYA_CLIENT_SECRET` janë të sakta
- Sigurohuni që Fixie proxy është duke funksionuar
- Kontrolloni që IP e Railway/Heroku është në Tuya whitelist (nëse keni kufizime IP)

### 4. Fixie nuk po funksionon

- Testoni Fixie URL direkt:
  ```bash
  curl -x http://fixie:password@ventoux.usefixie.com:80 https://api.ipify.org?format=json
  ```
- Duhet të kthejë IP-në e Fixie

## Kostot

### Railway (Rekomanduar)
- $5 credit falas çdo muaj
- Mjaftueshëm për përdorim të vogël/mesatar
- Pas $5, ~$0.01/orë

### Heroku
- Plan falas me kufizime (dyno fle pas 30 min inaktivitet)
- Hobby plan: $7/muaj për dyno që është gjithmonë aktiv

### DigitalOcean
- $5/muaj për App Platform

## Siguria

1. **PROXY_SECRET**: Përdorni një secret të fortë dhe të gjatë
2. **HTTPS**: Të gjitha këto hosting providers ofrojnë HTTPS automatikisht
3. **Rate Limiting**: Konsideroni të shtoni rate limiting për të parandaluar abuzimin
4. **IP Whitelist**: Nëse mundeni, kufizoni qasjen vetëm nga IP e Lovable/Supabase

## Përmirësime të Mundshme

1. **Redis Caching**: Përdorni Redis për të cache token e Tuya
2. **Rate Limiting**: Shtoni express-rate-limit
3. **Logging**: Shtoni më shumë logging për debugging
4. **Health Checks**: Shtoni më shumë health checks për monitorim
