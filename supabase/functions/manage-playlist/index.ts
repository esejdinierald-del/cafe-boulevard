import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATE_ID = "00000000-0000-0000-0000-000000000001";

async function buildPlayNext(supabase: any) {
  const now = new Date().toISOString();

  const { data: nextSong } = await supabase
    .from("song_requests")
    .select("*")
    .eq("status", "approved")
    .order("approved_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextSong) {
    await supabase
      .from("playlist_state")
      .update({ current_song_id: null, updated_at: now })
      .eq("id", STATE_ID);

    return { currentSong: null, playlist: [] };
  }

  await supabase
    .from("song_requests")
    .update({ played_at: now })
    .eq("id", nextSong.id);

  await supabase
    .from("playlist_state")
    .update({ current_song_id: nextSong.id, updated_at: now })
    .eq("id", STATE_ID);

  const { data: queue } = await supabase
    .from("song_requests")
    .select("*")
    .eq("status", "approved")
    .order("approved_at", { ascending: true });

  const playlist = (queue || []).filter((s: any) => s.id !== nextSong.id);
  return { currentSong: nextSong, playlist };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, song_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "get_state") {
      const { data: state, error } = await supabase
        .from("playlist_state")
        .select("current_song_id")
        .eq("id", STATE_ID)
        .single();
      if (error) throw error;

      let currentSong = null;
      if (state?.current_song_id) {
        const { data: song } = await supabase
          .from("song_requests")
          .select("*")
          .eq("id", state.current_song_id)
          .single();
        currentSong = song;
      }

      const { data: queue } = await supabase
        .from("song_requests")
        .select("*")
        .eq("status", "approved")
        .order("approved_at", { ascending: true });

      const playlist = (queue || []).filter((s: any) => s.id !== state?.current_song_id);

      return new Response(JSON.stringify({ currentSong, playlist }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "play_next") {
      const result = await buildPlayNext(supabase);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_played") {
      if (!song_id) {
        return new Response(JSON.stringify({ error: "Missing song_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase
        .from("song_requests")
        .update({ status: "played" })
        .eq("id", song_id);

      const result = await buildPlayNext(supabase);
      return new Response(JSON.stringify(result), {
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