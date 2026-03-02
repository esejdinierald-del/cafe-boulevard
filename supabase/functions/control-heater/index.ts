import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple in-memory rate limiting per table number
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30000; // 30 seconds between requests per table

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableNumber } = await req.json();

    // Input validation: tableNumber must be a string/number, not empty, reasonable length
    if (!tableNumber || typeof tableNumber !== 'string' && typeof tableNumber !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid table number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const tableStr = String(tableNumber).trim();
    if (tableStr.length === 0 || tableStr.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Invalid table number format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Rate limiting per table
    const now = Date.now();
    const lastRequest = rateLimitMap.get(tableStr);
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
      return new Response(
        JSON.stringify({ error: `Please wait ${waitSec} seconds before trying again` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }
    rateLimitMap.set(tableStr, now);

    console.log('Controlling heater for table:', tableStr);

    // Get device info from database
    const { data: deviceData, error: deviceError } = await supabase
      .from('table_devices')
      .select('device_id, device_name')
      .eq('table_number', tableStr)
      .eq('device_type', 'heater')
      .single();

    if (deviceError || !deviceData) {
      console.error('Device not found for table:', tableStr, deviceError);
      return new Response(
        JSON.stringify({ error: `No heater configured for this table` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Found device:', deviceData.device_name);

    // Use proxy server
    const proxyUrl = Deno.env.get('TUYA_PROXY_URL');
    const proxySecret = Deno.env.get('TUYA_PROXY_SECRET');
    
    if (!proxyUrl) {
      console.error('TUYA_PROXY_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Heater service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const proxyResponse = await fetch(`${proxyUrl}/control-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${proxySecret || 'default-secret'}`,
      },
      body: JSON.stringify({
        deviceId: deviceData.device_id,
        command: { code: 'switch_1', value: true }
      })
    });

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      console.error('Proxy error:', proxyResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to control heater' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const result = await proxyResponse.json();
    console.log('Heater activated for table:', tableStr);

    return new Response(
      JSON.stringify({ 
        message: `Heater turned on for ${deviceData.device_name}`,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error controlling heater:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
