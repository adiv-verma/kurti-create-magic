import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create admin client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create user client to verify auth
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

    const { fabricId, imageUrl, contentId, customPrompt } = await req.json();

    if (!fabricId || !imageUrl) {
      return new Response(JSON.stringify({ error: "fabricId and imageUrl are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user owns this fabric image
    const { data: fabricImage, error: fabricError } = await supabaseAdmin
      .from("fabric_images")
      .select("id, user_id")
      .eq("id", fabricId)
      .eq("user_id", user.id)
      .single();

    if (fabricError || !fabricImage) {
      return new Response(JSON.stringify({ error: "Fabric image not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build image prompt based on user customization
    const defaultImagePrompt = "Generate a professional fashion photography image of an Indian woman model wearing a beautiful kurti made from this exact fabric pattern. The model should have Indian features, a natural elegant pose, studio lighting with soft shadows, high-end fashion photography style. The kurti should showcase the fabric's pattern, color, and texture prominently. Clean white or neutral studio background. Full body or three-quarter shot.";
    
    const imagePrompt = customPrompt 
      ? `${defaultImagePrompt}\n\nAdditional customization requested by the user: ${customPrompt}`
      : defaultImagePrompt;

    // Step 1: Generate model image using Nano Banana Pro (image generation model)
    console.log("Generating model image with prompt:", customPrompt ? `custom: ${customPrompt}` : "default");
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: imagePrompt,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("Image generation error:", imageResponse.status, errorText);
      
      if (imageResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (imageResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Image generation failed: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    let modelImageUrl: string | null = null;

    // Extract generated image and upload to storage
    const generatedImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    console.log("Image generation response has image:", !!generatedImage, "starts with data:image:", generatedImage?.startsWith("data:image"));
    
    if (generatedImage && generatedImage.startsWith("data:image")) {
      // Upload base64 image to storage
      const base64Data = generatedImage.split(",")[1];
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const fileName = `${user.id}/${Date.now()}-model.png`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("generated-images")
        .upload(fileName, imageBytes, { contentType: "image/png" });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from("generated-images")
          .getPublicUrl(fileName);
        modelImageUrl = urlData.publicUrl;
      } else {
        console.error("Storage upload error:", uploadError);
      }
    } else {
      console.warn("No valid image in AI response. Full response structure:", JSON.stringify({
        hasChoices: !!imageData.choices,
        choiceCount: imageData.choices?.length,
        hasMessage: !!imageData.choices?.[0]?.message,
        hasImages: !!imageData.choices?.[0]?.message?.images,
        imageCount: imageData.choices?.[0]?.message?.images?.length,
      }));
      
      // Retry once if no image was returned
      console.log("Retrying image generation...");
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
           model: "google/gemini-3-pro-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: imagePrompt,
                  },
                {
                  type: "image_url",
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryImage = retryData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (retryImage && retryImage.startsWith("data:image")) {
          const base64Data = retryImage.split(",")[1];
          const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const fileName = `${user.id}/${Date.now()}-model.png`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("generated-images")
            .upload(fileName, imageBytes, { contentType: "image/png" });
          if (!uploadError) {
            const { data: urlData } = supabaseAdmin.storage
              .from("generated-images")
              .getPublicUrl(fileName);
            modelImageUrl = urlData.publicUrl;
            console.log("Retry succeeded, image uploaded");
          }
        } else {
          console.warn("Retry also failed to produce an image");
        }
      }
    }

    // Step 2: Generate captions using text model
    console.log("Generating captions...");
    const captionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Look at this fabric image and write two captions for a kurti made from it.

Return ONLY a JSON object with exactly this format, no other text:
{"hindi": "2-3 sentences in Hindi describing the kurti design, fabric quality, colors, pattern, and suitable occasions", "english": "2-3 sentences in English with the same description"}

Make the captions appealing for Indian fashion buyers on social media. Mention fabric type, colors, patterns, and occasions.${customPrompt ? `\n\nAdditional context from the user about the content: ${customPrompt}` : ""}`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    let captionHindi = "";
    let captionEnglish = "";

    if (captionResponse.ok) {
      const captionData = await captionResponse.json();
      const captionText = captionData.choices?.[0]?.message?.content || "";
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = captionText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          captionHindi = parsed.hindi || "";
          captionEnglish = parsed.english || "";
        }
      } catch (e) {
        console.error("Caption parsing error:", e);
        captionEnglish = captionText;
      }
    }

    // Step 3: Save or update generated content
    if (contentId) {
      // Update existing content (regeneration)
      const { error: updateError } = await supabaseAdmin
        .from("generated_content")
        .update({
          model_image_url: modelImageUrl,
          caption_hindi: captionHindi,
          caption_english: captionEnglish,
          status: "pending",
        })
        .eq("id", contentId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    } else {
      // Insert new content
      const { error: insertError } = await supabaseAdmin
        .from("generated_content")
        .insert({
          user_id: user.id,
          fabric_id: fabricId,
          model_image_url: modelImageUrl,
          caption_hindi: captionHindi,
          caption_english: captionEnglish,
          status: "pending",
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, modelImageUrl, captionHindi, captionEnglish }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
