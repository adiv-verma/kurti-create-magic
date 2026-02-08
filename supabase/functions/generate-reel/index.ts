import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const elevenlabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");

    if (!elevenlabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contentId } = await req.json();

    if (!contentId) {
      return new Response(JSON.stringify({ error: "contentId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the generated content
    const { data: content, error: contentError } = await supabaseAdmin
      .from("generated_content")
      .select("*")
      .eq("id", contentId)
      .eq("user_id", user.id)
      .single();

    if (contentError || !content) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or update reel record
    const { data: existingReel } = await supabaseAdmin
      .from("reels")
      .select("id")
      .eq("content_id", contentId)
      .eq("user_id", user.id)
      .maybeSingle();

    let reelId: string;

    if (existingReel) {
      reelId = existingReel.id;
      await supabaseAdmin
        .from("reels")
        .update({
          status: "generating_audio",
          caption_english: content.caption_english,
          caption_hindi: content.caption_hindi,
          error_message: null,
        })
        .eq("id", reelId);
    } else {
      const { data: newReel, error: insertError } = await supabaseAdmin
        .from("reels")
        .insert({
          user_id: user.id,
          content_id: contentId,
          status: "generating_audio",
          caption_english: content.caption_english,
          caption_hindi: content.caption_hindi,
        })
        .select("id")
        .single();

      if (insertError || !newReel) {
        throw new Error("Failed to create reel record");
      }
      reelId = newReel.id;
    }

    try {
      // Step 1: Generate Hindi TTS voiceover
      console.log("Generating Hindi voiceover...");
      const hindiText = content.caption_hindi || "यह एक सुंदर कुर्ती है।";
      
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenlabsApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: hindiText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
              style: 0.4,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        const errText = await ttsResponse.text();
        console.error("TTS error:", ttsResponse.status, errText);
        throw new Error(`TTS generation failed: ${ttsResponse.status}`);
      }

      const ttsBuffer = await ttsResponse.arrayBuffer();
      const ttsFileName = `${user.id}/${reelId}-voiceover.mp3`;

      const { error: ttsUploadError } = await supabaseAdmin.storage
        .from("reel-assets")
        .upload(ttsFileName, new Uint8Array(ttsBuffer), {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (ttsUploadError) {
        console.error("TTS upload error:", ttsUploadError);
        throw new Error("Failed to upload voiceover");
      }

      const { data: ttsUrlData } = supabaseAdmin.storage
        .from("reel-assets")
        .getPublicUrl(ttsFileName);

      console.log("Voiceover uploaded successfully");

      // Step 2: Generate background music
      console.log("Generating background music...");
      const englishCaption = content.caption_english || "Beautiful Indian fashion kurti";
      const musicPrompt = `Elegant, upbeat Indian fashion background music. Theme: ${englishCaption}. Style: modern Bollywood-inspired, trendy, suitable for Instagram reels. Duration: 15-20 seconds. Instrumental only, no vocals.`;

      const musicResponse = await fetch(
        "https://api.elevenlabs.io/v1/music",
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenlabsApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: musicPrompt,
            duration_seconds: 20,
          }),
        }
      );

      if (!musicResponse.ok) {
        const errText = await musicResponse.text();
        console.error("Music error:", musicResponse.status, errText);
        throw new Error(`Music generation failed: ${musicResponse.status}`);
      }

      const musicBuffer = await musicResponse.arrayBuffer();
      const musicFileName = `${user.id}/${reelId}-music.mp3`;

      const { error: musicUploadError } = await supabaseAdmin.storage
        .from("reel-assets")
        .upload(musicFileName, new Uint8Array(musicBuffer), {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (musicUploadError) {
        console.error("Music upload error:", musicUploadError);
        throw new Error("Failed to upload music");
      }

      const { data: musicUrlData } = supabaseAdmin.storage
        .from("reel-assets")
        .getPublicUrl(musicFileName);

      console.log("Music uploaded successfully");

      // Update reel with audio URLs
      await supabaseAdmin
        .from("reels")
        .update({
          voiceover_url: ttsUrlData.publicUrl,
          music_url: musicUrlData.publicUrl,
          status: "ready",
        })
        .eq("id", reelId);

      return new Response(
        JSON.stringify({
          success: true,
          reelId,
          voiceoverUrl: ttsUrlData.publicUrl,
          musicUrl: musicUrlData.publicUrl,
          captionEnglish: content.caption_english,
          captionHindi: content.caption_hindi,
          modelImageUrl: content.model_image_url,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (genError) {
      // Update reel status to failed
      await supabaseAdmin
        .from("reels")
        .update({
          status: "failed",
          error_message: genError instanceof Error ? genError.message : "Unknown error",
        })
        .eq("id", reelId);

      throw genError;
    }
  } catch (error) {
    console.error("generate-reel error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
