import { useState } from "react";
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
import { downloadContentBundle } from "@/lib/downloadContent";
import { useBackgroundImages } from "@/hooks/useBackgroundImages";

type ContentStatus = Database["public"]["Enums"]["content_status"];

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

  const { backgroundImages } = useBackgroundImages();

  const { data: content = [], isLoading } = useQuery({
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContentStatus }) => {
      const { error } = await supabase
        .from("generated_content")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      toast({ title: `Content ${variables.status}` });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ContentStatus }) => {
      const { error } = await supabase
        .from("generated_content")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
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
      if (response.error) throw response.error;
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      toast({ title: "Regeneration complete!" });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
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
    toast({ title: "Downloading content..." });
    await downloadContentBundle(item);
    toast({ title: "Download complete!" });
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
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={toggleSelect}
                    onUpdateStatus={(id, status) =>
                      updateStatusMutation.mutate({ id, status })
                    }
                    onOpenRegenerateDialog={openRegenerateDialog}
                    onDownload={handleDownload}
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
    </AppLayout>
  );
};

export default Library;
