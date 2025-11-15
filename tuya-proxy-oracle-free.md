# 🎉 Tuya Proxy - 100% FALAS me Oracle Cloud

## Oracle Cloud Free Tier (FALAS PËRGJITHMONË)

Oracle Cloud ofron një plan **Always Free** (jo trial) që përfshin:
- 2 VM me AMD (1/8 OCPU, 1GB RAM)
- ose 4 VM me ARM Ampere A1 (1 OCPU, 6GB RAM)
- IP adresa fikse - **FALAS PËRGJITHMONË**
- 200GB Block Storage
- Zero kosto, asnjë kartë krediti e kërkuar pas trial-it

## Hapi 1: Krijo Oracle Cloud Account

1. Shko në: https://www.oracle.com/cloud/free/
2. Kliko **Start for free**
3. Plotëso formën (do të duhet një kartë krediti për verifikim, por NUK do të ngarkohet)
4. Zgjidh rajonin më të afërt (Germany Central Frankfurt për Europë)

**RËNDËSISHME:** Pas trial-it 30-ditor (300$ credit), "Always Free" resurset mbeten FALAS përgjithmonë.

## Hapi 2: Krijo Virtual Machine (VM)

1. Log in në Oracle Cloud Console
2. Menu → **Compute** → **Instances**
3. Kliko **Create Instance**

### Konfigurimi i Instance (Përdor këto settings):

**Name:** `tuya-proxy`

**Image and Shape:**
- Image: **Ubuntu 22.04** (Canonical Ubuntu)
- Shape: Kliko **Change Shape**
  - Zgjedh: **VM.Standard.E2.1.Micro** (Always Free Eligible)
  - ose: **VM.Standard.A1.Flex** (ARM, më i fuqishëm, Always Free)

**Networking:**
- Lëre default (krijon VCN automatikisht)
- **Assign a public IPv4 address:** ✅ Po (check)

**SSH Keys:**
- Kliko **Generate a key pair for me**
- Download **private key** (e rëndësishme! do të duhet për SSH)
- Download **public key** (opsionale)

Kliko **Create** - Prit 2-3 minuta derisa VM të bëhet "Running"

## Hapi 3: Hap Portin 3000 në Firewall

### 3.1 Security List në Oracle Cloud

1. Shko tek instance-i yt
2. **Primary VNIC** → Kliko subnet-in (diçka si "subnet-xxxxx")
3. **Security Lists** → Kliko security list-in (default)
4. **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: **TCP**
   - Destination Port Range: `3000`
   - Description: `Tuya Proxy Server`
5. Kliko **Add Ingress Rules**

### 3.2 Ubuntu Firewall (iptables)

```bash
# Pasi të lidhesh me SSH (shih hapin 4), ekzekuto:
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

## Hapi 4: Lidhu me VM përmes SSH

### Windows (PowerShell):

```powershell
# Ndrysho path-in te private key dhe IP-në
ssh -i C:\Users\YourName\Downloads\ssh-key.key ubuntu@YOUR_VM_IP
```

### Mac/Linux:

```bash
# Vendos private key në ~/.ssh dhe ndrysho IP-në
chmod 400 ~/Downloads/ssh-key.key
ssh -i ~/Downloads/ssh-key.key ubuntu@YOUR_VM_IP
```

**Nëse merr "Connection refused"**: Prit 1-2 minuta, VM po starton ende.

## Hapi 5: Instalo Proxy Server në VM

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Instalo Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifiko
node --version
npm --version

# Krijo directory
mkdir ~/tuya-proxy
cd ~/tuya-proxy

# Krijo server file
nano server.js
```

**Copy-paste këtë kod në `server.js`** (Ctrl+Shift+V në nano):

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const TUYA_CLIENT_ID = process.env.TUYA_CLIENT_ID;
const TUYA_CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET;
const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';
const PROXY_SECRET = process.env.PROXY_SECRET;
const PORT = 3000;

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${PROXY_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function generateSign(clientId, secret, timestamp, stringToSign, accessToken = '') {
  const str = clientId + accessToken + timestamp + stringToSign;
  const hash = crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex');
  return hash.toUpperCase();
}

async function getTuyaToken() {
  const timestamp = Date.now().toString();
  const sign = generateSign(TUYA_CLIENT_ID, TUYA_CLIENT_SECRET, timestamp, 'GET');

  const response = await fetch(`${TUYA_BASE_URL}/v1.0/token?grant_type=1`, {
    method: 'GET',
    headers: {
      'client_id': TUYA_CLIENT_ID,
      'sign': sign,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
    },
  });

  const data = await response.json();
  if (!data.success || !data.result?.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(data));
  }
  return data.result.access_token;
}

async function controlDevice(deviceId, command, accessToken) {
  const timestamp = Date.now().toString();
  const commandBody = JSON.stringify({ commands: [command] });
  const commandUrl = `/v1.0/devices/${deviceId}/commands`;
  const stringToSign = `POST\n${sha256(commandBody)}\n\n${commandUrl}`;
  const sign = generateSign(TUYA_CLIENT_ID, TUYA_CLIENT_SECRET, timestamp, stringToSign, accessToken);

  const response = await fetch(`${TUYA_BASE_URL}${commandUrl}`, {
    method: 'POST',
    headers: {
      'client_id': TUYA_CLIENT_ID,
      'sign': sign,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'access_token': accessToken,
      'Content-Type': 'application/json',
    },
    body: commandBody,
  });

  return await response.json();
}

app.post('/control-device', authenticate, async (req, res) => {
  try {
    const { deviceId, command } = req.body;
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'deviceId and command are required' });
    }

    const accessToken = await getTuyaToken();
    const result = await controlDevice(deviceId, command, accessToken);

    if (!result.success) {
      return res.status(500).json({ error: 'Command failed', details: result });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tuya Proxy Server running on port ${PORT}`);
});
```

**Ruaj:** Ctrl+O, Enter, Ctrl+X

```bash
# Krijo package.json
npm init -y

# Instalo dependencies
npm install express

# Krijo .env file
nano .env
```

**Shto në `.env`** (ndrysho me kredencialet e tua):

```
TUYA_CLIENT_ID=xxxxx
TUYA_CLIENT_SECRET=xxxxx
PROXY_SECRET=zgjedh-nje-password-te-forte-ketu
```

**Ruaj:** Ctrl+O, Enter, Ctrl+X

```bash
# Testo server-in
node server.js
```

Nëse sheh "Tuya Proxy Server running on port 3000" - **SUKSES!** ✅

**Ctrl+C** për të ndaluar server-in.

## Hapi 6: Ekzekuto Server-in Automatikisht (PM2)

```bash
# Instalo PM2
sudo npm install -g pm2

# Load environment variables dhe start
pm2 start server.js --name tuya-proxy --env-file .env

# Auto-start pas reboot
pm2 startup
# Copy-paste komandën që të jep dhe ekzekutoje

pm2 save

# Kontrollo status
pm2 status
pm2 logs tuya-proxy
```

## Hapi 7: Gjej IP-në e VM

```bash
curl ifconfig.me
```

Ose shiko në Oracle Cloud Console → Instance Details → **Public IP Address**

## Hapi 8: Testo nga Kompjuteri Yt

```bash
# Ndrysho YOUR_VM_IP me IP-në tënde
curl http://YOUR_VM_IP:3000/health
```

Duhet të shohësh: `{"status":"ok","timestamp":"..."}`

## Hapi 9: Shto IP-në në Tuya Whitelist

1. Shko në Tuya Developer Platform
2. Cloud → Project Management → [Your Project]
3. Cloud Authorization IP Address → Configure IP whitelist
4. Central Europe Data Center → **+ Add IP**
5. Shto IP-në e VM: `YOUR_VM_IP`
6. **Save**

## Hapi 10: Konfigurim në Lovable (Shto Secrets)

Në Lovable, shto këto secrets:

1. **TUYA_PROXY_URL**: `http://YOUR_VM_IP:3000`
2. **TUYA_PROXY_SECRET**: (e njëjta që vure në .env)

## Hapi 11: TESTO!

Hap aplikacionin dhe kliko **"Ndez Ngrohësen"** - duhet të punojë! 🔥

---

## Troubleshooting

### "Connection refused"
```bash
# Kontrollo nëse server po ekzekutohet
pm2 status
pm2 logs tuya-proxy

# Restart nëse duhet
pm2 restart tuya-proxy
```

### "Unauthorized" error
- Kontrollo që TUYA_PROXY_SECRET në Lovable të jetë i njëjtë me atë në .env

### "Permission denied" nga Tuya
- Sigurohu që IP-ja është shtuar në whitelist
- Prit 2-3 minuta pas shtimit të IP-së

### Humbëm lidhjen SSH
```bash
# Restart VM nga Oracle Cloud Console
# Instance → More Actions → Reboot
```

### PM2 nuk po fillon pas reboot
```bash
pm2 unstartup
pm2 startup
# Copy paste komandën
pm2 save
```

---

## Kostot

**ZERO!** 🎉 Oracle Cloud "Always Free" është falas përgjithmonë, pa asnjë kosto fshehur.

---

## Siguria

- Ndryshoni `PROXY_SECRET` me një vlerë të fortë
- Konsideroni përdorimin e HTTPS (mund të shtoni Caddy ose nginx me Let's Encrypt)
- Mund të kufizoni IP-të që mund të thërrasin proxy-n në firewall

---

## HTTPS (Opsional - Rekomandohet)

```bash
# Instalo Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Konfigurim (duhet të kesh një domain që point-on tek VM IP-ja)
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

---

## Përfundim

✅ Proxy server falas me IP fikse  
✅ Zero kosto  
✅ Ngrohëset funksionojnë perfekt  

Nëse ke pyetje, më thuaj! 🎉
