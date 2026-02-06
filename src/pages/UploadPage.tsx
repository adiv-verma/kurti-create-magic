import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Upload, Loader2, ImageIcon, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackgroundImages } from "@/hooks/useBackgroundImages";
import BackgroundSelectDialog from "@/components/upload/BackgroundSelectDialog";
import ImageGallery from "@/components/upload/ImageGallery";

type UploadTab = "fabric" | "background";

const tabConfig: Record<UploadTab, { label: string; icon: typeof Upload; description: string; helpText: string }> = {
  fabric: {
    label: "Fabric Images",
    icon: Layers,
    description: "Upload fabric images to generate AI fashion content",
    helpText: "Each fabric image will trigger automatic AI generation of a model wearing a kurti made from this fabric, along with bilingual captions. You'll be asked to choose a background image before generation starts.",
  },
  background: {
    label: "Background Images",
    icon: ImageIcon,
    description: "Upload custom backgrounds for AI-generated photos",
    helpText: "Background images are used as studio settings for your AI model photos. Upload indoor/outdoor scenes, textured walls, or studio backdrops. You'll be able to choose from these when generating content from fabric images.",
  },
};

const UploadPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<UploadTab>("fabric");

  // Background selection dialog state
  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [pendingFabricFiles, setPendingFabricFiles] = useState<File[]>([]);

  const config = tabConfig[activeTab];
  const { backgroundImages, uploadBackgrounds, deleteBackground } = useBackgroundImages();

  // Fetch fabric images
  const { data: fabricImages = [] } = useQuery({
    queryKey: ["fabric_images", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fabric_images")
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Upload fabric images with a chosen background
  const uploadFabricWithBackground = async (files: File[], backgroundUrl: string | null) => {
    if (!user) return;
    setUploading(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("fabric-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("fabric-images").getPublicUrl(filePath);

        const { data: fabricData, error: insertError } = await supabase
          .from("fabric_images")
          .insert({
            user_id: user.id,
            image_url: urlData.publicUrl,
            file_name: file.name,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (fabricData) {
          triggerGeneration(fabricData.id, urlData.publicUrl, backgroundUrl);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["fabric_images"] });
      toast({ title: "Upload complete!", description: "AI content generation has started." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const triggerGeneration = async (fabricId: string, imageUrl: string, backgroundImageUrl: string | null) => {
    try {
      const response = await supabase.functions.invoke("generate-content", {
        body: { fabricId, imageUrl, backgroundImageUrl },
      });
      if (response.error) {
        console.error("Generation error:", response.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ["generated_content"] });
      }
    } catch (err) {
      console.error("Failed to trigger generation:", err);
    }
  };

  const deleteFabricMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from("fabric_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fabric_images"] });
      toast({ title: "Image deleted" });
    },
  });

  // Handle fabric files — open background selection dialog first
  const handleFabricFiles = (files: File[]) => {
    setPendingFabricFiles(files);
    setBgDialogOpen(true);
  };

  // After user picks a background (or skips)
  const handleBackgroundSelected = (backgroundUrl: string | null) => {
    setBgDialogOpen(false);
    uploadFabricWithBackground(pendingFabricFiles, backgroundUrl);
    setPendingFabricFiles([]);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      if (activeTab === "fabric") {
        handleFabricFiles(files);
      } else {
        uploadBackgrounds.mutate(files);
      }
    },
    [activeTab, uploadBackgrounds]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (activeTab === "fabric") {
      handleFabricFiles(files);
    } else {
      uploadBackgrounds.mutate(files);
    }
    e.target.value = "";
  };

  const isUploading = uploading || uploadBackgrounds.isPending;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Upload Images</h1>
          <p className="text-muted-foreground mb-6">{config.description}</p>
        </motion.div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(tabConfig) as UploadTab[]).map((tab) => {
            const TabIcon = tabConfig[tab].icon;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tabConfig[tab].label}
              </button>
            );
          })}
        </div>

        {/* Info box */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-4 mb-6 border-l-4 border-l-primary"
        >
          <p className="text-sm text-foreground leading-relaxed">
            💡 {config.helpText}
          </p>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-foreground font-medium">
                  {activeTab === "fabric" ? "Uploading & generating..." : "Uploading..."}
                </p>
                {activeTab === "fabric" && (
                  <p className="text-sm text-muted-foreground">
                    AI is creating model images and captions
                  </p>
                )}
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium mb-1">
                  Drag and drop your {activeTab} images here
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports JPG, PNG, WebP up to 20MB
                </p>
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">Browse Files</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </motion.div>

        {/* Gallery */}
        {activeTab === "fabric" && (
          <ImageGallery
            title="Uploaded Fabrics"
            images={fabricImages}
            onDelete={(id) => deleteFabricMutation.mutate(id)}
          />
        )}
        {activeTab === "background" && (
          <ImageGallery
            title="Uploaded Backgrounds"
            images={backgroundImages}
            onDelete={(id) => deleteBackground.mutate(id)}
          />
        )}
      </div>

      {/* Background selection dialog — shown before fabric upload begins */}
      <BackgroundSelectDialog
        open={bgDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBgDialogOpen(false);
            setPendingFabricFiles([]);
          }
        }}
        backgrounds={backgroundImages}
        onConfirm={handleBackgroundSelected}
      />
    </AppLayout>
  );
};

export default UploadPage;
