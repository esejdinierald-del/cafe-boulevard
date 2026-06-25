import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { table_number } = await req.json();

    if (!table_number) {
      return new Response(
        JSON.stringify({ error: "Missing table_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const num = parseInt(String(table_number), 10);
    const isNumeric = Number.isFinite(num) && String(num) === String(table_number).trim();
    const fallback = isNumeric ? `Tavolina ${num}` : String(table_number);

    if (!isNumeric) {
      return new Response(
        JSON.stringify({ name: fallback }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("tables")
      .select("name")
      .eq("number", num)
      .maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ name: fallback }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ name: data.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});