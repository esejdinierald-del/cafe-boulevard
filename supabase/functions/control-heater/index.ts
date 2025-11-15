import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMART_LIFE_CLIENT_ID = Deno.env.get('SMART_LIFE_CLIENT_ID');
const SMART_LIFE_CLIENT_SECRET = Deno.env.get('SMART_LIFE_CLIENT_SECRET');
const SMART_LIFE_PROJECT_CODE = Deno.env.get('SMART_LIFE_PROJECT_CODE');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableNumber } = await req.json();
    
    console.log('Controlling heater for table:', tableNumber);

    // Get device ID from database based on table number
    const { data: deviceData, error: deviceError } = await supabase
      .from('table_devices')
      .select('device_id, device_name')
      .eq('table_number', tableNumber)
      .eq('device_type', 'heater')
      .single();

    if (deviceError || !deviceData) {
      console.error('Device not found for table:', tableNumber, deviceError);
      throw new Error(`No heater configured for table ${tableNumber}`);
    }

    const deviceId = deviceData.device_id;
    console.log('Found device:', deviceData.device_name, 'ID:', deviceId);

    // Step 1: Get access token from Smart Life API using new signature method
    const timestamp = Date.now().toString();
    const httpMethod = 'GET';
    const url = '/v1.0/token?grant_type=1';
    const contentHash = await sha256(''); // Empty body for GET
    
    // stringToSign = HTTPMethod + "\n" + Content-SHA256 + "\n" + "" + "\n" + URL
    const stringToSign = `${httpMethod}\n${contentHash}\n\n${url}`;
    const sign = await generateSignWithBody(SMART_LIFE_CLIENT_ID!, SMART_LIFE_CLIENT_SECRET!, timestamp, stringToSign);
    
    console.log('Token request - timestamp:', timestamp);
    console.log('Token request - stringToSign:', stringToSign);
    console.log('Token request - sign:', sign);
    
    const tokenResponse = await fetch('https://openapi.tuyaeu.com/v1.0/token?grant_type=1', {
      method: 'GET',
      headers: {
        'client_id': SMART_LIFE_CLIENT_ID!,
        'sign': sign,
        't': timestamp,
        'sign_method': 'HMAC-SHA256',
      }
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Error getting token:', errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token API response:', JSON.stringify(tokenData));
    
    if (!tokenData.result || !tokenData.result.access_token) {
      console.error('Invalid token response structure:', tokenData);
      throw new Error(`Invalid token response: ${JSON.stringify(tokenData)}`);
    }
    
    const accessToken = tokenData.result.access_token;
    
    console.log('Access token obtained successfully');

    // Step 2: Turn on heater device using new signature method
    const commandTimestamp = Date.now().toString();
    const commandMethod = 'POST';
    const commandUrl = `/v1.0/devices/${deviceId}/commands`;
    const commandBody = JSON.stringify({
      commands: [
        {
          code: 'switch_1',
          value: true
        }
      ]
    });
    const commandContentHash = await sha256(commandBody);
    const commandStringToSign = `${commandMethod}\n${commandContentHash}\n\n${commandUrl}`;
    const commandSign = await generateSignWithBody(SMART_LIFE_CLIENT_ID!, SMART_LIFE_CLIENT_SECRET!, commandTimestamp, commandStringToSign, accessToken);
    
    const controlResponse = await fetch(`https://openapi.tuyaeu.com/v1.0/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: {
        'client_id': SMART_LIFE_CLIENT_ID!,
        'access_token': accessToken,
        'sign': commandSign,
        't': commandTimestamp,
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json',
      },
      body: commandBody
    });

    if (!controlResponse.ok) {
      const errorText = await controlResponse.text();
      console.error('Error controlling device:', errorText);
      throw new Error(`Failed to control device: ${errorText}`);
    }

    const controlData = await controlResponse.json();
    console.log('Heater control response:', controlData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Heater turned on successfully',
        data: controlData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in control-heater function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to compute SHA256 hash
async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.toLowerCase();
}

// Helper function to generate signature using new signature method
async function generateSignWithBody(clientId: string, secret: string, timestamp: string, stringToSign: string, accessToken?: string): Promise<string> {
  const str = accessToken 
    ? `${clientId}${accessToken}${timestamp}${stringToSign}`
    : `${clientId}${timestamp}${stringToSign}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(str);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.toUpperCase();
}

// Legacy helper functions (keeping for reference)
async function generateSignToken(stringToSign: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(stringToSign);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.toUpperCase();
}

async function generateSign(clientId: string, secret: string, timestamp: string, accessToken?: string): Promise<string> {
  const str = accessToken 
    ? `${clientId}${accessToken}${timestamp}`
    : `${clientId}${timestamp}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(str);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.toUpperCase();
}
