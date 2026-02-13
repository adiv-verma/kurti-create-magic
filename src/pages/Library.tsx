import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";
import ContentCard from "@/components/library/ContentCard";
import BulkActions from "@/components/library/BulkActions";
import RegenerateDialog from "@/components/library/RegenerateDialog";
import CropDialog from "@/components/library/CropDialog";
import ReelPreviewDialog from "@/components/library/ReelPreviewDialog";
import { downloadContentBundle } from "@/lib/downloadContent";
import { useBackgroundImages } from "@/hooks/useBackgroundImages";
import { getCroppedImageBlob } from "@/lib/cropImage";
import { useReelGeneration } from "@/hooks/useReelGeneration";
import type { PixelCrop } from "react-image-crop";

type ContentStatus = Database["public"]["Enums"]["content_status"];

/** Unified shape for both generated_content and multi_fabric_results */
export interface LibraryItem {
  id: string;
  source: "content" | "multi_fabric";
  status: ContentStatus;
  created_at: string;
  model_image_url: string | null;
  caption_hindi: string | null;
  caption_english: string | null;
  fabric_id: string | null;
  fabric_images: { image_url: string; file_name: string } | null;
  // original row for download helper
  _raw?: any;
}

const statusFilters: { label: string; value: ContentStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const Library = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ContentStatus | "all">("all");
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Regenerate dialog state
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenTarget, setRegenTarget] = useState<{
    contentId: string;
    fabricId: string;
    imageUrl: string;
  } | null>(null);

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState<{
    contentId: string;
    imageUrl: string;
    source: "content" | "multi_fabric";
  } | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const { backgroundImages } = useBackgroundImages();
  const {
    generatingReelId,
    reelPreview,
    reelDialogOpen,
    setReelDialogOpen,
    generateReel,
    approveAndDownload,
  } = useReelGeneration();

  // Fetch generated_content
  const { data: rawContent = [], isLoading: loadingContent } = useQuery({
    queryKey: ["generated_content", user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from("generated_content")
        .select("*, fabric_images(image_url, file_name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch multi_fabric_results (completed ones)
  const { data: rawMultiFabric = [], isLoading: loadingMulti } = useQuery({
    queryKey: ["multi_fabric_results_library", user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from("multi_fabric_results")
        .select("*, multi_fabric_jobs(source_image_url)")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("approval_status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLoading = loadingContent || loadingMulti;

  // Merge both into unified LibraryItem[]
  const content: LibraryItem[] = useMemo(() => {
    const contentItems: LibraryItem[] = rawContent.map((item: any) => ({
      id: item.id,
      source: "content" as const,
      status: item.status,
      created_at: item.created_at,
      model_image_url: item.model_image_url,
      caption_hindi: item.caption_hindi,
      caption_english: item.caption_english,
      fabric_id: item.fabric_id,
      fabric_images: item.fabric_images,
      _raw: item,
    }));

    const multiItems: LibraryItem[] = rawMultiFabric.map((item: any) => ({
      id: item.id,
      source: "multi_fabric" as const,
      status: item.approval_status,
      created_at: item.created_at,
      model_image_url: item.generated_image_url,
      caption_hindi: item.caption_hindi,
      caption_english: item.caption_english,
      fabric_id: null,
      fabric_images: item.multi_fabric_jobs
        ? { image_url: item.multi_fabric_jobs.source_image_url, file_name: `Multi-Fabric (${item.label})` }
        : null,
      _raw: item,
    }));

    return [...contentItems, ...multiItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [rawContent, rawMultiFabric]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, source }: { id: string; status: ContentStatus; source: "content" | "multi_fabric" }) => {
      if (source === "multi_fabric") {
        const { error } = await supabase
          .from("multi_fabric_results")
          .update({ approval_status: status })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("generated_content")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      queryClient.invalidateQueries({ queryKey: ["multi_fabric_results_library"] });
      toast({ title: `Content ${variables.status}` });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ContentStatus }) => {
      // Separate ids by source
      const contentIds = ids.filter((id) => content.find((c) => c.id === id)?.source === "content");
      const multiIds = ids.filter((id) => content.find((c) => c.id === id)?.source === "multi_fabric");

      if (contentIds.length > 0) {
        const { error } = await supabase.from("generated_content").update({ status }).in("id", contentIds);
        if (error) throw error;
      }
      if (multiIds.length > 0) {
        const { error } = await supabase.from("multi_fabric_results").update({ approval_status: status }).in("id", multiIds);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      queryClient.invalidateQueries({ queryKey: ["multi_fabric_results_library"] });
      setSelectedIds(new Set());
      toast({ title: `${variables.ids.length} items ${variables.status}` });
    },
  });

  const openRegenerateDialog = (contentId: string, fabricId: string, imageUrl: string) => {
    setRegenTarget({ contentId, fabricId, imageUrl });
    setRegenDialogOpen(true);
  };

  const handleRegenerateConfirm = async (customPrompt: string, backgroundUrl: string | null) => {
    if (!regenTarget) return;
    const { contentId, fabricId, imageUrl } = regenTarget;

    setRegenDialogOpen(false);
    setRegeneratingId(contentId);

    try {
      const response = await supabase.functions.invoke("generate-content", {
        body: {
          fabricId,
          imageUrl,
          contentId,
          customPrompt: customPrompt || undefined,
          backgroundImageUrl: backgroundUrl,
        },
      });
      if (response.error) {
        // Check if it's a 409 partial-success (fabric deleted mid-generation)
        const msg = (response.error as any)?.message || (response.error as any)?.context?.body || "";
        const isPartial = typeof msg === "string" && msg.includes("removed");
        if (isPartial) {
          toast({ title: "Source image was removed", description: "The fabric was deleted during regeneration. Please re-upload.", variant: "destructive" });
        } else {
          throw response.error;
        }
      } else {
        toast({ title: "Regeneration complete!" });
      }
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setRegeneratingId(null);
      setRegenTarget(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = async (item: any) => {
    toast({ title: "Downloading content bundle...", description: "Files will download one at a time" });
    await downloadContentBundle(item, (label) => {
      toast({ title: label });
    });
    toast({ title: "Download complete!" });
  };

  const openCropDialog = (contentId: string, imageUrl: string, source: "content" | "multi_fabric" = "content") => {
    setCropTarget({ contentId, imageUrl, source });
    setCropDialogOpen(true);
  };

  const handleCropSave = async (croppedAreaPixels: PixelCrop) => {
    if (!cropTarget) return;
    setIsCropping(true);
    try {
      const croppedBlob = await getCroppedImageBlob(cropTarget.imageUrl, croppedAreaPixels);
      const fileName = `cropped_${cropTarget.contentId}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("generated-images")
        .upload(fileName, croppedBlob, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("generated-images")
        .getPublicUrl(fileName);

      if (cropTarget.source === "multi_fabric") {
        const { error: updateError } = await supabase
          .from("multi_fabric_results")
          .update({ generated_image_url: publicUrlData.publicUrl })
          .eq("id", cropTarget.contentId);
        if (updateError) throw updateError;
        queryClient.invalidateQueries({ queryKey: ["multi_fabric_results_library"] });
      } else {
        const { error: updateError } = await supabase
          .from("generated_content")
          .update({ model_image_url: publicUrlData.publicUrl })
          .eq("id", cropTarget.contentId);
        if (updateError) throw updateError;
        queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      }

      toast({ title: "Image cropped and saved!" });
      setCropDialogOpen(false);
      setCropTarget(null);
    } catch (err: any) {
      toast({ title: "Crop failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Content Library</h1>
          <p className="text-muted-foreground mb-6">
            Review, approve, or reject AI-generated content
          </p>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setSelectedIds(new Set());
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : content.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No content found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload fabric images to generate content
            </p>
          </div>
        ) : (
          <>
            {/* Bulk actions */}
            <BulkActions
              selectedCount={selectedIds.size}
              totalCount={content.length}
              onSelectAll={() => setSelectedIds(new Set(content.map((c) => c.id)))}
              onDeselectAll={() => setSelectedIds(new Set())}
              onBulkApprove={() =>
                bulkUpdateMutation.mutate({
                  ids: Array.from(selectedIds),
                  status: "approved",
                })
              }
              onBulkReject={() =>
                bulkUpdateMutation.mutate({
                  ids: Array.from(selectedIds),
                  status: "rejected",
                })
              }
            />

            <div className="grid gap-6">
              <AnimatePresence>
                {content.map((item, i) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    index={i}
                    isRegenerating={regeneratingId === item.id}
                    isGeneratingReel={generatingReelId === item.id}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={toggleSelect}
                    onUpdateStatus={(id, status) =>
                      updateStatusMutation.mutate({ id, status, source: item.source })
                    }
                    onOpenRegenerateDialog={openRegenerateDialog}
                    onDownload={handleDownload}
                    onCrop={openCropDialog}
                    onGenerateReel={generateReel}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Regenerate customization dialog */}
      <RegenerateDialog
        open={regenDialogOpen}
        onOpenChange={setRegenDialogOpen}
        isRegenerating={regeneratingId !== null}
        backgrounds={backgroundImages}
        onConfirm={handleRegenerateConfirm}
      />

      {/* Crop dialog */}
      <CropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={cropTarget?.imageUrl || null}
        isSaving={isCropping}
        onSave={handleCropSave}
      />

      {/* Reel preview dialog */}
      <ReelPreviewDialog
        open={reelDialogOpen}
        onOpenChange={setReelDialogOpen}
        reel={reelPreview}
        onApprove={approveAndDownload}
      />
    </AppLayout>
  );
};

export default Library;
