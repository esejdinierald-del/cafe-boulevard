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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableNumber } = await req.json();
    console.log('Controlling heater for table:', tableNumber);

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

    // Use proxy server instead of direct Tuya API call
    const proxyUrl = Deno.env.get('TUYA_PROXY_URL');
    const proxySecret = Deno.env.get('TUYA_PROXY_SECRET');
    
    if (!proxyUrl) {
      console.error('TUYA_PROXY_URL not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Proxy server not configured. Please set TUYA_PROXY_URL secret.',
          instructions: 'Follow the setup guide in tuya-proxy-setup.md'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Call the proxy server
    console.log('Calling proxy server:', proxyUrl);
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
        JSON.stringify({ 
          error: `Proxy request failed: ${errorText}`,
          statusCode: proxyResponse.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const result = await proxyResponse.json();
    console.log('Proxy response:', result);

    return new Response(
      JSON.stringify({ 
        message: `Heater turned on for ${deviceData.device_name}`,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
