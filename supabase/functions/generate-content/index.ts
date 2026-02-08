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

    const { fabricId, imageUrl, contentId, customPrompt, backgroundImageUrl: providedBgUrl, uploadType, mannequinImageUrl } = await req.json();

    // uploadType: "fabric" (default) or "mannequin"
    const isMannequin = uploadType === "mannequin";

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

    // Use explicitly provided background URL, or fall back to random from user's uploads
    let backgroundImageUrl: string | null = providedBgUrl || null;

    if (!backgroundImageUrl) {
      const { data: bgFiles } = await supabaseAdmin.storage
        .from("background-images")
        .list(user.id, { limit: 100 });

      if (bgFiles && bgFiles.length > 0) {
        const randomBg = bgFiles[Math.floor(Math.random() * bgFiles.length)];
        const { data: bgUrlData } = supabaseAdmin.storage
          .from("background-images")
          .getPublicUrl(`${user.id}/${randomBg.name}`);
        backgroundImageUrl = bgUrlData.publicUrl;
        console.log("Using random background image:", randomBg.name);
      }
    } else {
      console.log("Using user-selected background image");
    }

    // Build image prompt based on upload type
    const defaultImagePrompt = isMannequin
      ? `Generate a professional fashion product photography image with these STRICT requirements:

1. MANNEQUIN CONVERSION: The source image shows a model wearing a garment. You MUST convert this to show the EXACT SAME garment displayed on the mannequin/dress form provided in the reference image. Remove the human model entirely and place the garment on the mannequin. The mannequin style, shape, and form must match the provided mannequin reference image exactly.
2. GARMENT FIDELITY: The garment on the mannequin must be an EXACT match to the garment in the source image — same design, pattern, color, texture, print, and embroidery. Do NOT alter, simplify, or reinterpret the garment in any way. It should look like the exact same garment was physically placed on the mannequin.
3. BACKGROUND: ${backgroundImageUrl ? "Use the provided background image as the setting/backdrop for the photo." : "Use a clean, professional studio background with neutral tones."}
4. LIGHTING: Professional studio lighting with soft shadows, high-end fashion product photography style. Even, well-distributed lighting to showcase the fabric details.
5. FABRIC FIDELITY: Preserve every detail — weave, texture, color gradients, motifs, embroidery, prints. No artistic license.
6. STYLING: The mannequin display should look premium and retail-ready, similar to high-end e-commerce product shots.`
      : `Generate a professional fashion photography image with these STRICT requirements:

1. MODEL FACE & BODY: An Indian woman model, FULL BODY shot from head to toe. Her FACE must be CLEARLY VISIBLE, well-lit, sharp, and photorealistic — showing natural Indian features with a confident, pleasant expression. The face is a TOP PRIORITY and must NOT be obscured, blurred, cropped, or hidden in any way. Natural skin texture, clear eyes, and realistic facial details are essential.
2. KURTI/GARMENT: The model is wearing a garment made EXACTLY from the provided fabric. CRITICAL: The garment design, pattern, color, texture, print, and embroidery must be an EXACT match to the original fabric image. Do NOT alter, simplify, or reinterpret the fabric design in any way. The garment should look like it was cut and stitched directly from this exact fabric — no creative variations, no color shifts, no pattern modifications.
3. LOWER GARMENT: The model MUST wear plain, simple bottoms (churidar, palazzo, or straight pants) with ABSOLUTELY NO embroidery, NO prints, NO patterns on the lower garment. The lower should be a solid neutral color (white, beige, black, or matching the kurti).
4. BACKGROUND: ${backgroundImageUrl ? "Use the provided background image as the setting/backdrop for the photo." : "Use a clean, professional studio background."}
5. LIGHTING: Professional studio lighting with soft shadows, high-end fashion photography style. Ensure the model's face is well-illuminated.
6. FABRIC FIDELITY: The fabric on the garment must closely match the input fabric image. Preserve details — weave, texture, color gradients, motifs, embroidery, prints. No artistic license. However, do NOT sacrifice model face quality for fabric accuracy.`;

    const imagePrompt = customPrompt 
      ? `${defaultImagePrompt}\n\nADDITIONAL CUSTOMIZATION: ${customPrompt}`
      : defaultImagePrompt;

    // Step 1: Generate model image using Nano Banana Pro (image generation model)
    console.log("Generating image with type:", isMannequin ? "mannequin" : "fabric", "mannequin ref:", !!mannequinImageUrl);

    // Build message content with source image, optional mannequin reference, and optional background
    const messageContent: any[] = [
      {
        type: "text",
        text: imagePrompt,
      },
      {
        type: "image_url",
        image_url: { url: imageUrl },
      },
    ];

    // Include mannequin reference image if available (for mannequin mode)
    if (isMannequin && mannequinImageUrl) {
      messageContent.push({
        type: "image_url",
        image_url: { url: mannequinImageUrl },
      });
    }

    // Include background image if available
    if (backgroundImageUrl) {
      messageContent.push({
        type: "image_url",
        image_url: { url: backgroundImageUrl },
      });
    }

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
            content: messageContent,
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
              content: messageContent,
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
          background_image_url: backgroundImageUrl,
          status: "pending",
        })
        .eq("id", contentId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    } else {
      // Insert new content — handle FK violation gracefully if fabric was deleted mid-generation
      const { error: insertError } = await supabaseAdmin
        .from("generated_content")
        .insert({
          user_id: user.id,
          fabric_id: fabricId,
          model_image_url: modelImageUrl,
          caption_hindi: captionHindi,
          caption_english: captionEnglish,
          background_image_url: backgroundImageUrl,
          status: "pending",
        });

      if (insertError) {
        if (insertError.code === "23503") {
          // FK violation — fabric was deleted during generation
          console.warn("Fabric was deleted during generation, content not saved:", fabricId);
          return new Response(
            JSON.stringify({ 
              error: "The fabric image was removed while content was being generated. Please re-upload and try again.",
              partialSuccess: true,
              modelImageUrl,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw insertError;
      }
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
