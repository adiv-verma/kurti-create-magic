import { supabase } from "@/integrations/supabase/client";

/**
 * Download the AI-generated model image, captions, and any associated reel
 * assets (voiceover, music, video) as a bundle.
 */
export async function downloadContentBundle(
  item: {
    id: string;
    model_image_url: string | null;
    caption_hindi: string | null;
    caption_english: string | null;
    fabric_images?: { file_name?: string } | null;
  },
  onProgress?: (label: string) => void,
) {
  const baseName = item.fabric_images?.file_name?.replace(/\.[^.]+$/, "") || "kurti-content";

  // Download captions as text file
  onProgress?.("Downloading captions...");
  const captionText = [
    "=== Hindi Caption ===",
    item.caption_hindi || "(No Hindi caption)",
    "",
    "=== English Caption ===",
    item.caption_english || "(No English caption)",
  ].join("\n");

  const captionBlob = new Blob([captionText], { type: "text/plain" });
  const captionUrl = URL.createObjectURL(captionBlob);
  triggerDownload(captionUrl, `${baseName}-captions.txt`);
  URL.revokeObjectURL(captionUrl);

  // Download model image
  if (item.model_image_url) {
    onProgress?.("Downloading model image...");
    await delay(600);
    await downloadFile(item.model_image_url, `${baseName}-model.png`);
  }

  // Fetch associated reel and download its assets
  try {
    const { data: reel, error: reelError } = await supabase
      .from("reels")
      .select("voiceover_url, music_url, video_url")
      .eq("content_id", item.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reelError) {
      console.error("Failed to query reel:", reelError);
    }

    if (reel) {
      if (reel.voiceover_url) {
        onProgress?.("Downloading voiceover...");
        await delay(800);
        await downloadFile(reel.voiceover_url, `${baseName}-voiceover.mp3`);
      }
      if (reel.music_url) {
        onProgress?.("Downloading music...");
        await delay(800);
        await downloadFile(reel.music_url, `${baseName}-music.mp3`);
      }
      if (reel.video_url) {
        onProgress?.("Downloading video...");
        await delay(800);
        await downloadFile(reel.video_url, `${baseName}-reel.mp4`);
      }
    } else {
      console.log("No reel found for content_id:", item.id);
    }
  } catch (err) {
    console.error("Failed to fetch reel assets:", err);
  }
}

async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, filename);
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    console.error(`Failed to download ${filename}:`, err);
  }
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
