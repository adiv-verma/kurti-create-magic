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

    const { action, jobId, sourceImageUrl, mannequinImageUrl, backgroundImageUrl, colorOutputMode } = await req.json();

    // ACTION 1: Detect labels from image
    if (action === "detect") {
      if (!sourceImageUrl) {
        return new Response(JSON.stringify({ error: "sourceImageUrl is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create job record
      const { data: job, error: jobError } = await supabaseAdmin
        .from("multi_fabric_jobs")
        .insert({
          user_id: user.id,
          source_image_url: sourceImageUrl,
          status: "analyzing",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Use Gemini vision to detect labels
      const detectResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this fabric/garment image carefully. The image contains fabric pieces/swatches that are labeled with letters. These letters can be ANY color (green, red, white, black, etc.) and may be handwritten or digitally added.

The labels mean:
- T = Top (kurti/shirt fabric)
- D = Dupatta (scarf/stole fabric)
- B = Bottom (pants/salwar fabric)  
- C = Color variant (same design in a different color)

Your task:
1. Identify ALL labeled pieces in the image
2. For each piece, determine its label (T, D, B, or C)
3. Describe each piece briefly (color, pattern, fabric type)
4. Count how many distinct SAMPLES/SETS are in the image. A sample is typically one T+D combination, or T+D+B combination. Color variants (C) are additional samples of the same design.

Return ONLY a JSON object with this exact format:
{
  "pieces": [
    {"label": "T", "description": "Dark navy blue floral print fabric with pink flowers", "position": "center-right"},
    {"label": "D", "description": "Light beige fabric with brown floral motifs", "position": "background"},
    {"label": "C", "description": "Blue color variant of the same design", "position": "right side"}
  ],
  "sample_count": 1,
  "has_bottom": false,
  "color_variants": ["blue", "pink"],
  "summary": "One kurti set with top and dupatta, no separate bottom fabric (use plain). Two color variants available."
}

Be precise about what you see. If B is not present, set has_bottom to false.`,
                },
                {
                  type: "image_url",
                  image_url: { url: sourceImageUrl },
                },
              ],
            },
          ],
        }),
      });

      if (!detectResponse.ok) {
        const errText = await detectResponse.text();
        console.error("Detection error:", detectResponse.status, errText);
        await supabaseAdmin.from("multi_fabric_jobs").update({ status: "failed", error_message: "Label detection failed" }).eq("id", job.id);

        if (detectResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Label detection failed");
      }

      const detectData = await detectResponse.json();
      const detectText = detectData.choices?.[0]?.message?.content || "";

      let detectedLabels: any = {};
      try {
        const jsonMatch = detectText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          detectedLabels = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Detection parse error:", e);
        await supabaseAdmin.from("multi_fabric_jobs").update({ status: "failed", error_message: "Could not parse label detection" }).eq("id", job.id);
        return new Response(JSON.stringify({ error: "Could not parse detected labels" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update job with detected labels
      await supabaseAdmin.from("multi_fabric_jobs").update({
        detected_labels: detectedLabels,
        status: "detected",
      }).eq("id", job.id);

      return new Response(
        JSON.stringify({ success: true, jobId: job.id, detectedLabels }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION 2: Generate mannequin images
    if (action === "generate") {
      if (!jobId) {
        return new Response(JSON.stringify({ error: "jobId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch job
      const { data: job, error: jobFetchError } = await supabaseAdmin
        .from("multi_fabric_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single();

      if (jobFetchError || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update job with mannequin/background/mode
      await supabaseAdmin.from("multi_fabric_jobs").update({
        mannequin_image_url: mannequinImageUrl || null,
        background_image_url: backgroundImageUrl || null,
        color_output_mode: colorOutputMode || "separate",
        status: "generating",
      }).eq("id", jobId);

      const labels = job.detected_labels as any;
      const pieces = labels?.pieces || [];
      const colorVariants = labels?.color_variants || [];
      const hasBottom = labels?.has_bottom || false;
      const sampleCount = Math.max(labels?.sample_count || 1, 1);

      // Determine how many mannequin images to generate
      // If colorOutputMode is "combined", generate one image with all mannequins side by side
      // If "separate", generate one per sample/variant
      const outputMode = colorOutputMode || "separate";

      if (outputMode === "combined") {
        // Generate single combined image
        const { data: result, error: resultError } = await supabaseAdmin
          .from("multi_fabric_results")
          .insert({
            job_id: jobId,
            user_id: user.id,
            label: "combined",
            color_variant: colorVariants.join(", ") || null,
            status: "generating",
          })
          .select()
          .single();

        if (resultError) throw resultError;

        const combinedPrompt = buildCombinedPrompt(pieces, hasBottom, sampleCount, colorVariants, mannequinImageUrl, backgroundImageUrl);
        const imageUrl = await generateMannequinImage(lovableApiKey, combinedPrompt, job.source_image_url, mannequinImageUrl, backgroundImageUrl);

        // Generate captions
        const captions = await generateCaptions(lovableApiKey, job.source_image_url, pieces);

        if (imageUrl) {
          const storedUrl = await uploadGeneratedImage(supabaseAdmin, user.id, imageUrl);
          await supabaseAdmin.from("multi_fabric_results").update({
            generated_image_url: storedUrl,
            caption_hindi: captions.hindi,
            caption_english: captions.english,
            status: "completed",
          }).eq("id", result.id);
        } else {
          await supabaseAdmin.from("multi_fabric_results").update({
            status: "failed",
            error_message: "Image generation failed",
          }).eq("id", result.id);
        }
      } else {
      // Generate separate images for each sample/color variant
        const samplesToGenerate: { label: string; colorVariant: string | null; description: string }[] = [];

        // Base sample
        const topPiece = pieces.find((p: any) => p.label === "T");
        const dupattaPiece = pieces.find((p: any) => p.label === "D");
        const bottomPiece = pieces.find((p: any) => p.label === "B");

        samplesToGenerate.push({
          label: "main",
          colorVariant: null,
          description: `Top: ${topPiece?.description || "as shown"}, Dupatta: ${dupattaPiece?.description || "as shown"}${bottomPiece ? `, Bottom: ${bottomPiece.description}` : ", Bottom: plain matching"}`,
        });

        // Color variants
        const colorPieces = pieces.filter((p: any) => p.label === "C");
        for (const cp of colorPieces) {
          samplesToGenerate.push({
            label: "color_variant",
            colorVariant: cp.description,
            description: `Same design as the main sample but in this color variant: ${cp.description}. Top and dupatta should match this color.${hasBottom ? " Bottom fabric also in matching variant." : " Bottom: plain matching color."}`,
          });
        }

        // If sample_count > 1 + color variants, add extra
        for (let i = samplesToGenerate.length; i < sampleCount; i++) {
          samplesToGenerate.push({
            label: `sample_${i + 1}`,
            colorVariant: null,
            description: `Sample ${i + 1} from the image`,
          });
        }

        // Create all result records first
        const resultRecords: { id: string; sample: typeof samplesToGenerate[0] }[] = [];
        for (const sample of samplesToGenerate) {
          const { data: result, error: resultError } = await supabaseAdmin
            .from("multi_fabric_results")
            .insert({
              job_id: jobId,
              user_id: user.id,
              label: sample.label,
              color_variant: sample.colorVariant,
              status: "generating",
            })
            .select()
            .single();

          if (resultError) {
            console.error("Failed to create result record:", resultError);
            continue;
          }
          resultRecords.push({ id: result.id, sample });
        }

        // Generate captions once (shared across all variants)
        const captionsPromise = generateCaptions(lovableApiKey, job.source_image_url, pieces);

        // Generate all images in parallel
        const imagePromises = resultRecords.map(async ({ id, sample }) => {
          try {
            const prompt = buildSinglePrompt(sample.description, hasBottom, mannequinImageUrl, backgroundImageUrl);
            const imageUrl = await generateMannequinImage(lovableApiKey, prompt, job.source_image_url, mannequinImageUrl, backgroundImageUrl);

            if (imageUrl) {
              const storedUrl = await uploadGeneratedImage(supabaseAdmin, user.id, imageUrl);
              const captions = await captionsPromise;
              await supabaseAdmin.from("multi_fabric_results").update({
                generated_image_url: storedUrl,
                caption_hindi: captions.hindi,
                caption_english: captions.english,
                status: "completed",
              }).eq("id", id);
            } else {
              await supabaseAdmin.from("multi_fabric_results").update({
                status: "failed",
                error_message: "Image generation failed",
              }).eq("id", id);
            }
          } catch (genErr) {
            console.error("Generation error for sample:", sample.label, genErr);
            await supabaseAdmin.from("multi_fabric_results").update({
              status: "failed",
              error_message: genErr instanceof Error ? genErr.message : "Unknown error",
            }).eq("id", id);
          }
        });

        await Promise.all(imagePromises);
      }

      // Mark job completed
      await supabaseAdmin.from("multi_fabric_jobs").update({ status: "completed" }).eq("id", jobId);

      // Fetch results
      const { data: results } = await supabaseAdmin
        .from("multi_fabric_results")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      return new Response(
        JSON.stringify({ success: true, jobId, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'detect' or 'generate'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-multi-fabric error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSinglePrompt(
  sampleDescription: string,
  hasBottom: boolean,
  mannequinUrl: string | null,
  bgUrl: string | null
): string {
  return `Generate a professional fashion product photography image showing a wooden bust mannequin/dress form displaying an Indian suit/kurti set with the fabric DRAPED over it (unstitched fabric draped elegantly, NOT a stitched garment).

STRICT REQUIREMENTS:
1. MANNEQUIN: ${mannequinUrl ? "Use the provided mannequin reference image to match the exact style, shape, and form of the mannequin/dress form." : "Use a professional wooden bust dress form/mannequin with a golden/wooden stand."} The mannequin style, pose, and form must be EXACTLY THE SAME across all generated images for this job.
2. GARMENT STYLE: The fabric must be DRAPED over the mannequin as unstitched fabric — showing it as a suit piece/dress material, NOT as a finished stitched garment. The fabric should fall naturally over the mannequin form.
3. GARMENT: Display the garment pieces as described: ${sampleDescription}
4. TOP (Kurti): Must be made EXACTLY from the fabric shown in the source image. Preserve every detail — weave, texture, color, motifs, embroidery, prints. The fabric fidelity is CRITICAL. The top fabric should be draped over the bust of the mannequin.
5. DUPATTA: If a dupatta piece is identified, drape it elegantly over one shoulder of the mannequin, showing its fabric clearly with its patterns and border visible.
6. BOTTOM: ${hasBottom ? "Use the bottom fabric as shown in the source image, draped below the mannequin or displayed alongside." : "The bottom should be PLAIN, solid-color fabric matching the top's primary color. NO prints or patterns on the bottom."}
7. BACKGROUND: ${bgUrl ? "Use the provided background image as the setting/backdrop." : "Use a clean, professional studio background with neutral tones."}
8. LIGHTING: Professional studio lighting, high-end fashion product photography style.
9. COMPOSITION: Full mannequin view showing all garment pieces clearly — top draped on bust, dupatta over shoulder, fabric flowing naturally.
10. CONSISTENCY: The mannequin orientation, camera angle, lighting direction, and composition must be IDENTICAL for every variant. Only the fabric colors/patterns should change between variants.`;
}

function buildCombinedPrompt(
  pieces: any[],
  hasBottom: boolean,
  sampleCount: number,
  colorVariants: string[],
  mannequinUrl: string | null,
  bgUrl: string | null
): string {
  return `Generate a professional fashion product photography image showing ${sampleCount} wooden bust mannequins/dress forms side by side in a single image, each with UNSTITCHED fabric DRAPED over them (not stitched garments).

STRICT REQUIREMENTS:
1. MANNEQUIN COUNT: Show exactly ${sampleCount} mannequins side by side.
2. MANNEQUIN STYLE: ${mannequinUrl ? "Each mannequin should match the style/form from the provided mannequin reference image." : "Use professional wooden bust dress forms/mannequins with golden/wooden stands."} ALL mannequins must be IDENTICAL in style, shape, pose, and orientation.
3. DRAPING: The fabric on each mannequin must be DRAPED as unstitched suit material — flowing naturally over the bust form, NOT as a finished stitched garment.
4. GARMENTS: Each mannequin displays the SAME kurti/suit design from the source image but in DIFFERENT COLOR VARIANTS: ${colorVariants.length > 0 ? colorVariants.join(", ") : "as seen in the image"}.
5. TOP FABRIC: The draped fabric on each mannequin must match the EXACT design/pattern from the source image. Only the COLOR should vary between mannequins. Preserve weave, texture, motifs, embroidery patterns.
6. DUPATTA: Each mannequin should have its matching dupatta draped elegantly over one shoulder, with borders and patterns visible.
7. BOTTOM: ${hasBottom ? "Use matching bottom fabric for each variant, displayed below or alongside." : "Plain, solid-color fabric matching each variant's primary color."}
8. BACKGROUND: ${bgUrl ? "Use the provided background image." : "Clean, professional studio background."}
9. LIGHTING: Even, professional studio lighting across all mannequins.
10. COMPOSITION: All mannequins evenly spaced, same size, same camera angle, full view of all draped fabric pieces.`;
}

async function generateMannequinImage(
  apiKey: string,
  prompt: string,
  sourceImageUrl: string,
  mannequinImageUrl: string | null,
  backgroundImageUrl: string | null
): Promise<string | null> {
  const messageContent: any[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: sourceImageUrl } },
  ];
  if (mannequinImageUrl) {
    messageContent.push({ type: "image_url", image_url: { url: mannequinImageUrl } });
  }
  if (backgroundImageUrl) {
    messageContent.push({ type: "image_url", image_url: { url: backgroundImageUrl } });
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Image gen error:", response.status, await response.text());
      if (attempt === 0) continue;
      return null;
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (generatedImage && generatedImage.startsWith("data:image")) {
      return generatedImage;
    }
    console.warn(`Attempt ${attempt + 1}: no image returned`);
  }
  return null;
}

async function uploadGeneratedImage(supabaseAdmin: any, userId: string, base64Url: string): Promise<string> {
  const base64Data = base64Url.split(",")[1];
  const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-mannequin.png`;

  const { error } = await supabaseAdmin.storage
    .from("generated-images")
    .upload(fileName, imageBytes, { contentType: "image/png" });

  if (error) throw error;

  const { data: urlData } = supabaseAdmin.storage
    .from("generated-images")
    .getPublicUrl(fileName);
  return urlData.publicUrl;
}

async function generateCaptions(apiKey: string, sourceImageUrl: string, pieces: any[]): Promise<{ hindi: string; english: string }> {
  try {
    const piecesDesc = pieces.map((p: any) => `${p.label}: ${p.description}`).join(", ");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
                text: `Look at this fabric image containing a suit set with these pieces: ${piecesDesc}.

Write two captions for this suit set displayed on a mannequin.

Return ONLY a JSON object:
{"hindi": "2-3 sentences in Hindi describing the suit design, fabric quality, colors, patterns, and occasions", "english": "2-3 sentences in English with same description"}

Make captions appealing for Indian fashion buyers on social media.`,
              },
              { type: "image_url", image_url: { url: sourceImageUrl } },
            ],
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { hindi: parsed.hindi || "", english: parsed.english || "" };
      }
    }
  } catch (e) {
    console.error("Caption error:", e);
  }
  return { hindi: "", english: "" };
}
