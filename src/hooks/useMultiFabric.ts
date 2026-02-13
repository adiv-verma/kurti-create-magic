import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface DetectedLabels {
  pieces: { label: string; description: string; position: string }[];
  sample_count: number;
  has_bottom: boolean;
  color_variants: string[];
  summary: string;
}

export interface MultiFabricJob {
  id: string;
  user_id: string;
  source_image_url: string;
  detected_labels: DetectedLabels | null;
  mannequin_image_url: string | null;
  background_image_url: string | null;
  color_output_mode: string;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MultiFabricResult {
  id: string;
  job_id: string;
  user_id: string;
  label: string;
  color_variant: string | null;
  generated_image_url: string | null;
  caption_hindi: string | null;
  caption_english: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export const useMultiFabric = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [detecting, setDetecting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["multi_fabric_jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("multi_fabric_jobs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as MultiFabricJob[];
    },
    enabled: !!user,
  });

  const fetchResultsForJob = async (jobId: string): Promise<MultiFabricResult[]> => {
    const { data, error } = await supabase
      .from("multi_fabric_results")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as MultiFabricResult[];
  };

  const detectLabels = async (file: File): Promise<{ jobId: string; detectedLabels: DetectedLabels } | null> => {
    if (!user) return null;
    setDetecting(true);
    try {
      // Upload source image to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${user.id}/multi-fabric/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("fabric-images")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("fabric-images")
        .getPublicUrl(filePath);

      const response = await supabase.functions.invoke("generate-multi-fabric", {
        body: { action: "detect", sourceImageUrl: urlData.publicUrl },
      });

      if (response.error) {
        throw new Error(typeof response.error === "string" ? response.error : "Detection failed");
      }

      const result = response.data;
      if (!result?.success) throw new Error(result?.error || "Detection failed");

      queryClient.invalidateQueries({ queryKey: ["multi_fabric_jobs"] });
      toast({ title: "Labels detected!", description: result.detectedLabels?.summary || "Review the detected pieces below." });
      return { jobId: result.jobId, detectedLabels: result.detectedLabels };
    } catch (error: any) {
      toast({ title: "Detection failed", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setDetecting(false);
    }
  };

  const generateMannequins = async (
    jobId: string,
    mannequinImageUrl: string | null,
    backgroundImageUrl: string | null,
    colorOutputMode: "separate" | "combined"
  ) => {
    setGenerating(true);
    try {
      const response = await supabase.functions.invoke("generate-multi-fabric", {
        body: { action: "generate", jobId, mannequinImageUrl, backgroundImageUrl, colorOutputMode },
      });

      if (response.error) {
        throw new Error(typeof response.error === "string" ? response.error : "Generation failed");
      }

      const result = response.data;
      if (!result?.success) throw new Error(result?.error || "Generation failed");

      queryClient.invalidateQueries({ queryKey: ["multi_fabric_jobs"] });
      toast({ title: "Generation complete!", description: `${result.results?.length || 0} mannequin image(s) generated.` });
      return result.results as MultiFabricResult[];
    } catch (error: any) {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase.from("multi_fabric_jobs").delete().eq("id", jobId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["multi_fabric_jobs"] });
    toast({ title: "Job deleted" });
  };

  return {
    jobs,
    jobsLoading,
    detecting,
    generating,
    detectLabels,
    generateMannequins,
    fetchResultsForJob,
    deleteJob,
  };
};
