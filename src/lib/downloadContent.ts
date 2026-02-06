/**
 * Download the AI-generated model image and captions as a bundle.
 * Creates a text file with captions and triggers the image download.
 */
export async function downloadContentBundle(item: {
  model_image_url: string | null;
  caption_hindi: string | null;
  caption_english: string | null;
  fabric_images?: { file_name?: string } | null;
}) {
  const baseName = item.fabric_images?.file_name?.replace(/\.[^.]+$/, "") || "kurti-content";

  // Download captions as text file
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
    try {
      const response = await fetch(item.model_image_url);
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      triggerDownload(imageUrl, `${baseName}-model.png`);
      URL.revokeObjectURL(imageUrl);
    } catch (err) {
      console.error("Failed to download image:", err);
    }
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
