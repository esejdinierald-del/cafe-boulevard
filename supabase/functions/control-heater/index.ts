import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMART_LIFE_CLIENT_ID = Deno.env.get('SMART_LIFE_CLIENT_ID');
const SMART_LIFE_CLIENT_SECRET = Deno.env.get('SMART_LIFE_CLIENT_SECRET');
const SMART_LIFE_PROJECT_CODE = Deno.env.get('SMART_LIFE_PROJECT_CODE');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableNumber } = await req.json();
    
    console.log('Controlling heater for table:', tableNumber);

    // Step 1: Get access token from Smart Life API
    const tokenResponse = await fetch('https://openapi.tuyaeu.com/v1.0/token?grant_type=1', {
      method: 'GET',
      headers: {
        'client_id': SMART_LIFE_CLIENT_ID!,
        'secret': SMART_LIFE_CLIENT_SECRET!,
        'sign': await generateSign(SMART_LIFE_CLIENT_ID!, SMART_LIFE_CLIENT_SECRET!, Date.now()),
        't': Date.now().toString(),
        'sign_method': 'HMAC-SHA256',
      }
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Error getting token:', errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.result.access_token;
    
    console.log('Access token obtained successfully');

    // Step 2: Turn on heater device
    const deviceId = 'bf4e1f7a553047a55capma'; // Device ID from Smart Life app
    
    const controlResponse = await fetch(`https://openapi.tuyaeu.com/v1.0/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: {
        'client_id': SMART_LIFE_CLIENT_ID!,
        'access_token': accessToken,
        'sign': await generateSign(SMART_LIFE_CLIENT_ID!, SMART_LIFE_CLIENT_SECRET!, Date.now(), accessToken),
        't': Date.now().toString(),
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands: [
          {
            code: 'switch_1',
            value: true
          }
        ]
      })
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

// Helper function to generate signature for Smart Life API
async function generateSign(clientId: string, secret: string, timestamp: number, accessToken?: string): Promise<string> {
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
