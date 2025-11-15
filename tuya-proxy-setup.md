# Udhëzime për Instalimin e Tuya Proxy Server

## Problemi
Supabase Edge Functions nuk kanë IP adresa fikse, por Tuya Cloud API kërkon IP whitelist. Kjo është zgjidhja.

## Zgjidhja: Proxy Server me IP Fikse

### Hapi 1: Merrni një VPS me IP Fikse

Opsione (çdo njëra funksionon):
- **DigitalOcean** ($6/muaj) - E rekomanduar, e lehtë për t'u përdorur
- **AWS Lightsail** ($5/muaj) 
- **Linode** ($5/muaj)
- **Raspberry Pi** në lokal (falas, por kërkon konfigurimi të router-it)

### Hapi 2: Instalo Node.js në Server

```bash
# SSH në server
ssh root@YOUR_SERVER_IP

# Instalo Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifiko instalimin
node --version
npm --version
```

### Hapi 3: Deploy Proxy Server

```bash
# Krijo directory
mkdir tuya-proxy
cd tuya-proxy

# Kopjo file-in tuya-proxy-server.js këtu
nano server.js
# Paste kodin nga tuya-proxy-server.js

# Instalo dependencies
npm init -y
npm install express node-fetch

# Krijo .env file
nano .env
```

Shto në `.env`:
```
TUYA_CLIENT_ID=your_client_id_here
TUYA_CLIENT_SECRET=your_client_secret_here
PROXY_SECRET=choose_a_strong_random_secret_here
PORT=3000
```

### Hapi 4: Testo Server-in Lokalisht

```bash
# Ekzekuto server-in
node server.js

# Në një terminal tjetër, testo:
curl http://localhost:3000/health
```

### Hapi 5: Vendos Server-in të Ekzekutohet Automatikisht (PM2)

```bash
# Instalo PM2
sudo npm install -g pm2

# Start server me PM2
pm2 start server.js --name tuya-proxy

# Vendose të startohet automatikisht pas reboot
pm2 startup
pm2 save

# Kontrollo status
pm2 status
pm2 logs tuya-proxy
```

### Hapi 6: Hap Portin në Firewall

```bash
# Ubuntu/Debian me ufw
sudo ufw allow 3000/tcp
sudo ufw reload

# Verifiko
sudo ufw status
```

### Hapi 7: Shto IP-në në Tuya Whitelist

1. Gjej IP-në e server-it:
```bash
curl ifconfig.me
```

2. Shko në Tuya Developer Platform:
   - Cloud → Project Management → [Your Project]
   - Cloud Authorization IP Address → Configure IP whitelist
   - Central Europe Data Center → Add IP
   - Shto IP-në e server-it tënd
   - Ruaj

### Hapi 8: Konfigurim në Lovable

1. Shto secret-et në Lovable:
   - `TUYA_PROXY_URL`: http://YOUR_SERVER_IP:3000
   - `TUYA_PROXY_SECRET`: (e njëjta si në .env të server-it)

2. Edge function-i është tashmë i përditësuar dhe do të përdorë proxy-n!

### Hapi 9: Testo

Hap aplikacionin dhe kliko "Ndez Ngrohësen" - duhet të funksionojë!

## Troubleshooting

### Server nuk starton
```bash
pm2 logs tuya-proxy --lines 50
```

### Kontrollo nëse porti është i hapur
```bash
# Nga laptop-i yt (jo server)
curl http://YOUR_SERVER_IP:3000/health
```

### Kontrollo secret-et
```bash
cat .env
```

### Restart server pas ndryshimeve
```bash
pm2 restart tuya-proxy
pm2 logs tuya-proxy
```

## Kostot

- VPS: ~$5-6/muaj
- Domain (opsional): ~$10/vit
- Trafikun: Shumë i ulët, i përfshirë në VPS

## Siguria

- TUYA_PROXY_SECRET duhet të jetë i fortë dhe i njëjtë në të dy vendet
- Mund të shtoni HTTPS me Let's Encrypt (falas) nëse dëshironi
- Mund të kufizoni IP-të që mund të thërrasin proxy-n

## SSL/HTTPS (Opsional por i Rekomanduar)

```bash
# Instalo Caddy (më i thjeshtë se nginx)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Konfigurim i shpejtë
sudo nano /etc/caddy/Caddyfile
```

Shto:
```
your-domain.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl restart caddy
```

Tani përdor `https://your-domain.com` si TUYA_PROXY_URL!
