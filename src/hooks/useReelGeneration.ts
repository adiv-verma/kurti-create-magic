import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export interface ReelData {
  reelId: string;
  voiceoverUrl: string;
  musicUrl: string;
  captionEnglish: string;
  captionHindi: string;
  modelImageUrl: string;
  contentId: string;
}

export function useReelGeneration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingReelId, setGeneratingReelId] = useState<string | null>(null);
  const [reelPreview, setReelPreview] = useState<ReelData | null>(null);
  const [reelDialogOpen, setReelDialogOpen] = useState(false);

  const generateReel = async (contentId: string) => {
    setGeneratingReelId(contentId);
    toast({ title: "Generating reel...", description: "Creating voiceover and background music. This may take a minute." });

    try {
      const response = await supabase.functions.invoke("generate-reel", {
        body: { contentId },
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (!data?.success) {
        throw new Error(data?.error || "Reel generation failed");
      }

      setReelPreview({
        reelId: data.reelId,
        voiceoverUrl: data.voiceoverUrl,
        musicUrl: data.musicUrl,
        captionEnglish: data.captionEnglish,
        captionHindi: data.captionHindi,
        modelImageUrl: data.modelImageUrl,
        contentId,
      });
      setReelDialogOpen(true);
      toast({ title: "Reel ready!", description: "Preview your reel and download when ready." });
    } catch (err: any) {
      console.error("Reel generation error:", err);
      toast({
        title: "Reel generation failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setGeneratingReelId(null);
    }
  };

  const approveAndDownload = async () => {
    if (!reelPreview) return;

    try {
      // Update content status to approved
      const { error } = await supabase
        .from("generated_content")
        .update({ status: "approved" as const })
        .eq("id", reelPreview.contentId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      toast({ title: "Content approved!" });
    } catch (err: any) {
      toast({
        title: "Failed to approve",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return {
    generatingReelId,
    reelPreview,
    reelDialogOpen,
    setReelDialogOpen,
    generateReel,
    approveAndDownload,
  };
}
