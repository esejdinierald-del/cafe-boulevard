// Tuya Proxy Server with Fixie Support
// Deploy this to Railway, Heroku, or any Node.js hosting
// Set these environment variables:
// - TUYA_CLIENT_ID
// - TUYA_CLIENT_SECRET  
// - PROXY_SECRET (for authentication)
// - FIXIE_URL (optional, e.g., http://fixie:password@ventoux.usefixie.com:80)
// - PORT (default: 3000)

const express = require('express');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';
const TUYA_CLIENT_ID = process.env.TUYA_CLIENT_ID;
const TUYA_CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET;
const PROXY_SECRET = process.env.PROXY_SECRET || 'default-secret';
const FIXIE_URL = process.env.FIXIE_URL; // e.g., http://fixie:password@ventoux.usefixie.com:80

// Token cache
let cachedToken = null;

// Parse Fixie URL if provided
let proxyConfig = null;
if (FIXIE_URL) {
  try {
    const proxyUrl = new URL(FIXIE_URL);
    proxyConfig = {
      host: proxyUrl.hostname,
      port: proxyUrl.port || 80,
      auth: proxyUrl.username ? `${proxyUrl.username}:${proxyUrl.password}` : undefined
    };
    console.log('Fixie proxy configured:', proxyConfig.host);
  } catch (err) {
    console.error('Invalid FIXIE_URL:', err.message);
  }
}

// Middleware to verify the proxy secret
const verifySecret = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${PROXY_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Make HTTP request through Fixie proxy or directly
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(url);
    const isHttps = targetUrl.protocol === 'https:';
    
    let requestOptions;
    
    if (proxyConfig) {
      // Use Fixie proxy
      requestOptions = {
        host: proxyConfig.host,
        port: proxyConfig.port,
        path: url, // Full URL when using proxy
        method: options.method || 'GET',
        headers: {
          ...options.headers,
          'Host': targetUrl.host
        }
      };
      
      if (proxyConfig.auth) {
        requestOptions.headers['Proxy-Authorization'] = `Basic ${Buffer.from(proxyConfig.auth).toString('base64')}`;
      }
    } else {
      // Direct request
      requestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: options.method || 'GET',
        headers: options.headers
      };
    }
    
    const client = proxyConfig ? http : (isHttps ? https : http);
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Get Tuya access token
async function getTuyaToken() {
  if (cachedToken && Date.now() < cachedToken.expireTime) {
    console.log('Using cached token');
    return cachedToken.accessToken;
  }
  
  console.log('Fetching new Tuya token...');
  const timestamp = Date.now().toString();
  const signStr = TUYA_CLIENT_ID + timestamp;
  const sign = crypto
    .createHmac('sha256', TUYA_CLIENT_SECRET)
    .update(signStr)
    .digest('hex')
    .toUpperCase();
  
  const response = await makeRequest(
    `${TUYA_BASE_URL}/v1.0/token?grant_type=1`,
    {
      method: 'GET',
      headers: {
        'client_id': TUYA_CLIENT_ID,
        'sign': sign,
        'sign_method': 'HMAC-SHA256',
        't': timestamp
      }
    }
  );
  
  if (response.status !== 200 || !response.data.success) {
    throw new Error(`Failed to get token: ${JSON.stringify(response.data)}`);
  }
  
  cachedToken = {
    accessToken: response.data.result.access_token,
    expireTime: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
  };
  
  console.log('Token obtained successfully');
  return cachedToken.accessToken;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    fixieConfigured: !!proxyConfig,
    timestamp: new Date().toISOString() 
  });
});

// Control device endpoint
app.post('/control-device', verifySecret, async (req, res) => {
  try {
    const { deviceId, command } = req.body;
    
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'deviceId and command are required' });
    }
    
    console.log(`Controlling device ${deviceId}:`, command);
    
    const accessToken = await getTuyaToken();
    const timestamp = Date.now().toString();
    const signStr = TUYA_CLIENT_ID + accessToken + timestamp;
    const sign = crypto
      .createHmac('sha256', TUYA_CLIENT_SECRET)
      .update(signStr)
      .digest('hex')
      .toUpperCase();
    
    const response = await makeRequest(
      `${TUYA_BASE_URL}/v1.0/devices/${deviceId}/commands`,
      {
        method: 'POST',
        headers: {
          'client_id': TUYA_CLIENT_ID,
          'access_token': accessToken,
          'sign': sign,
          'sign_method': 'HMAC-SHA256',
          't': timestamp,
          'Content-Type': 'application/json'
        },
        body: { commands: [command] }
      }
    );
    
    if (response.status !== 200 || !response.data.success) {
      console.error('Tuya API error:', response.data);
      return res.status(500).json({ error: 'Tuya API error', details: response.data });
    }
    
    console.log('Device controlled successfully');
    res.json({ success: true, result: response.data.result });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Tuya proxy server running on port ${PORT}`);
  console.log('Fixie proxy:', proxyConfig ? 'Configured' : 'Not configured');
  console.log('Environment check:');
  console.log('- TUYA_CLIENT_ID:', TUYA_CLIENT_ID ? 'Set' : 'Missing');
  console.log('- TUYA_CLIENT_SECRET:', TUYA_CLIENT_SECRET ? 'Set' : 'Missing');
  console.log('- PROXY_SECRET:', PROXY_SECRET ? 'Set' : 'Missing');
  console.log('- FIXIE_URL:', FIXIE_URL ? 'Set' : 'Not set');
});
