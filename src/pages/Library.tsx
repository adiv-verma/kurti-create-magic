import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, RefreshCw, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

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

  const regenerate = async (contentId: string, fabricId: string, imageUrl: string) => {
    setRegeneratingId(contentId);
    try {
      const response = await supabase.functions.invoke("generate-content", {
        body: { fabricId, imageUrl, contentId },
      });
      if (response.error) throw response.error;
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      toast({ title: "Regeneration complete!" });
    } catch (err: any) {
      toast({ title: "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegeneratingId(null);
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
              onClick={() => setFilter(f.value)}
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
          <div className="grid gap-6">
            <AnimatePresence>
              {content.map((item, i) => {
                const fabric = item.fabric_images as any;
                const isRegenerating = regeneratingId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-2xl overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Images */}
                      <div className="flex flex-row md:w-2/5">
                        <div className="w-1/2 aspect-square relative">
                          <img
                            src={fabric?.image_url}
                            alt="Fabric"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-2 left-2 text-xs bg-foreground/70 text-background px-2 py-1 rounded-md">
                            Fabric
                          </span>
                        </div>
                        <div className="w-1/2 aspect-square relative">
                          {item.model_image_url ? (
                            <img
                              src={item.model_image_url}
                              alt="AI Generated"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                            </div>
                          )}
                          <span className="absolute bottom-2 left-2 text-xs bg-foreground/70 text-background px-2 py-1 rounded-md">
                            AI Model
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {fabric?.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              item.status === "pending"
                                ? "status-badge-pending"
                                : item.status === "approved"
                                ? "status-badge-approved"
                                : "status-badge-rejected"
                            }`}
                          >
                            {item.status === "pending"
                              ? "Pending Review"
                              : item.status === "approved"
                              ? "Approved"
                              : "Rejected"}
                          </span>
                        </div>

                        {/* Captions */}
                        {item.caption_hindi && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              हिंदी
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">
                              {item.caption_hindi}
                            </p>
                          </div>
                        )}
                        {item.caption_english && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              English
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">
                              {item.caption_english}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto pt-3 border-t border-border">
                          {item.status !== "approved" && (
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90 text-success-foreground"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: item.id,
                                  status: "approved",
                                })
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {item.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: item.id,
                                  status: "rejected",
                                })
                              }
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRegenerating}
                            onClick={() =>
                              regenerate(item.id, item.fabric_id, fabric?.image_url)
                            }
                          >
                            {isRegenerating ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-1" />
                            )}
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Library;
