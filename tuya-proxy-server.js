// Tuya Proxy Server - Deploy this on a VPS with static IP
// This server will be whitelisted in Tuya and act as a proxy for your edge function

const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Configuration - Set these as environment variables
const TUYA_CLIENT_ID = process.env.TUYA_CLIENT_ID || 'YOUR_CLIENT_ID';
const TUYA_CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';
const PROXY_SECRET = process.env.PROXY_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Simple authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${PROXY_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Helper function to generate SHA256 hash
function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// Helper function to generate Tuya signature
function generateSign(clientId, secret, timestamp, stringToSign, accessToken = '') {
  const str = clientId + accessToken + timestamp + stringToSign;
  const hash = crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex');
  return hash.toUpperCase();
}

// Get Tuya access token
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

// Control Tuya device
async function controlDevice(deviceId, command, accessToken) {
  const timestamp = Date.now().toString();
  const commandBody = JSON.stringify({ commands: [command] });
  const commandUrl = `/v1.0/devices/${deviceId}/commands`;
  const stringToSign = `POST\n${sha256(commandBody)}\n\n${commandUrl}`;
  
  const sign = generateSign(
    TUYA_CLIENT_ID,
    TUYA_CLIENT_SECRET,
    timestamp,
    stringToSign,
    accessToken
  );

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

// Main endpoint
app.post('/control-device', authenticate, async (req, res) => {
  try {
    const { deviceId, command } = req.body;

    if (!deviceId || !command) {
      return res.status(400).json({ error: 'deviceId and command are required' });
    }

    console.log('Controlling device:', deviceId, 'Command:', command);

    // Get access token
    const accessToken = await getTuyaToken();
    console.log('Got access token');

    // Send command
    const result = await controlDevice(deviceId, command, accessToken);
    console.log('Command result:', result);

    if (!result.success) {
      return res.status(500).json({ error: 'Command failed', details: result });
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Tuya Proxy Server running on port ${PORT}`);
  console.log('Add this server\'s IP to Tuya whitelist');
});
