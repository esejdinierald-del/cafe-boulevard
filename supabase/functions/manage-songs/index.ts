import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shift-token",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchVideoMeta(videoId: string): Promise<{ title: string; thumbnail: string }> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(oembedUrl);
  if (!res.ok) throw new Error("Failed to fetch video info");
  const data = await res.json();
  return {
    title: data.title || "Video pa titull",
    thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, table_number, url, id } = body;

    // Staff-only actions require a valid shift token; customer 'request' stays public
    if (action === "approve" || action === "reject" || action === "played" || action === "clear_queue") {
      const auth = await requireShiftToken(req, body);
      if (!auth.ok) return auth.response;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    if (action === "request") {
      if (!table_number || !url) {
        return new Response(JSON.stringify({ error: "Missing table number or URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return new Response(JSON.stringify({ error: "Link i pavlefshëm YouTube" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { count, error: countError } = await supabase
        .from("song_requests")
        .select("*", { count: "exact", head: true })
        .eq("table_number", table_number)
        .in("status", ["pending", "approved"]);

      if (countError) throw countError;

      if (count && count >= 3) {
        return new Response(
          JSON.stringify({ error: "Ke tejkaluar limitin prej 3 këngësh në pritje!" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let meta;
      try {
        meta = await fetchVideoMeta(videoId);
      } catch {
        return new Response(
          JSON.stringify({ error: "Nuk mund të merreshin informacionet e videos" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error: insertError } = await supabase
        .from("song_requests")
        .insert({
          table_number,
          youtube_url: url,
          video_id: videoId,
          title: meta.title,
          thumbnail: meta.thumbnail,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, id: data.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("song_requests")
        .update({ status: "approved", approved_at: now })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("song_requests")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "played") {
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase
        .from("song_requests")
        .update({ status: "played" })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});