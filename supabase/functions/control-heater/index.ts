import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Set HTTP_PROXY environment variable if Fixie URL is provided
const FIXIE_PROXY_URL = Deno.env.get('FIXIE_PROXY_URL');
const TUYA_CLIENT_ID = Deno.env.get('SMART_LIFE_CLIENT_ID')!;
const TUYA_CLIENT_SECRET = Deno.env.get('SMART_LIFE_CLIENT_SECRET')!;
const TUYA_BASE_URL = 'https://openapi.tuyaeu.com';

if (FIXIE_PROXY_URL) {
  Deno.env.set('HTTP_PROXY', FIXIE_PROXY_URL);
  Deno.env.set('HTTPS_PROXY', FIXIE_PROXY_URL);
  console.log('Configured Fixie proxy');
}

// Cache for access token
let cachedToken: { access_token: string; expire_time: number } | null = null;

async function getTuyaAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expire_time) {
    console.log('Using cached Tuya token');
    return cachedToken.access_token;
  }

  console.log('Fetching new Tuya access token');
  const timestamp = Date.now().toString();
  const signStr = TUYA_CLIENT_ID + timestamp;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(TUYA_CLIENT_SECRET);
  const msgData = encoder.encode(signStr);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  const sign = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const response = await fetch(`${TUYA_BASE_URL}/v1.0/token?grant_type=1`, {
    method: 'GET',
    headers: {
      'client_id': TUYA_CLIENT_ID,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      't': timestamp,
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Tuya token error:', error);
    throw new Error(`Failed to get Tuya token: ${error}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    console.error('Tuya API error:', data);
    throw new Error(`Tuya API error: ${data.msg || 'Unknown error'}`);
  }

  // Cache token with 2-hour expiration
  cachedToken = {
    access_token: data.result.access_token,
    expire_time: Date.now() + (2 * 60 * 60 * 1000)
  };

  console.log('Successfully obtained Tuya access token');
  return data.result.access_token;
}

async function controlTuyaDevice(deviceId: string, commands: any): Promise<any> {
  const accessToken = await getTuyaAccessToken();
  const timestamp = Date.now().toString();
  
  const signStr = TUYA_CLIENT_ID + accessToken + timestamp;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(TUYA_CLIENT_SECRET);
  const msgData = encoder.encode(signStr);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  const sign = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const response = await fetch(`${TUYA_BASE_URL}/v1.0/devices/${deviceId}/commands`, {
    method: 'POST',
    headers: {
      'client_id': TUYA_CLIENT_ID,
      'access_token': accessToken,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      't': timestamp,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ commands })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Tuya control error:', error);
    throw new Error(`Failed to control device: ${error}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    console.error('Tuya API error:', data);
    throw new Error(`Tuya API error: ${data.msg || 'Unknown error'}`);
  }

  return data.result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableNumber } = await req.json();
    console.log('Controlling heater for table:', tableNumber);

    if (!FIXIE_PROXY_URL) {
      console.error('FIXIE_PROXY_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Fixie proxy not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get device info from database
    const { data: deviceData, error: deviceError } = await supabase
      .from('table_devices')
      .select('device_id, device_name')
      .eq('table_number', tableNumber)
      .eq('device_type', 'heater')
      .single();

    if (deviceError || !deviceData) {
      console.error('Device not found for table:', tableNumber, deviceError);
      return new Response(
        JSON.stringify({ error: `No heater configured for table ${tableNumber}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Found device:', deviceData.device_name, 'ID:', deviceData.device_id);

    // Control device via Tuya API through Fixie proxy
    const result = await controlTuyaDevice(deviceData.device_id, [
      { code: 'switch_1', value: true }
    ]);

    console.log('Successfully controlled device:', result);

    return new Response(
      JSON.stringify({ 
        message: `Heater turned on for ${deviceData.device_name}`,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error controlling heater:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
