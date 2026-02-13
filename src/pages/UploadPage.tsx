import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Upload, Loader2, ImageIcon, Layers, ShirtIcon, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackgroundImages } from "@/hooks/useBackgroundImages";
import { useMannequinImages } from "@/hooks/useMannequinImages";
import BackgroundSelectDialog from "@/components/upload/BackgroundSelectDialog";
import MannequinBackgroundSelectDialog from "@/components/upload/MannequinBackgroundSelectDialog";
import ImageGallery from "@/components/upload/ImageGallery";
import MultiFabricTab from "@/components/upload/MultiFabricTab";

type UploadTab = "fabric" | "multi-fabric" | "mannequin" | "mannequin-library" | "background";

const tabConfig: Record<UploadTab, { label: string; icon: typeof Upload; description: string; helpText: string }> = {
  fabric: {
    label: "Fabric",
    icon: Layers,
    description: "Upload fabric swatches to generate AI fashion content",
    helpText: "Upload plain fabric images — the AI will generate a photo of an Indian model wearing a kurti made from this fabric, along with bilingual captions. You'll choose a background before generation starts.",
  },
  "multi-fabric": {
    label: "Multi Fabric → Mannequin",
    icon: Grid3X3,
    description: "Upload labeled fabric images to generate multiple mannequin displays",
    helpText: "Upload a single image with labeled fabric pieces (T=Top, D=Dupatta, B=Bottom, C=Color variants). AI detects the labels and generates mannequin images for each sample.",
  },
  mannequin: {
    label: "Model → Mannequin",
    icon: ShirtIcon,
    description: "Upload model photos to convert to mannequin display",
    helpText: "Upload photos of a model wearing a garment — you'll select a mannequin reference and a background, then the AI will convert it into a professional mannequin/dress form shot while preserving the exact fabric details.",
  },
  "mannequin-library": {
    label: "Mannequin Library",
    icon: ShirtIcon,
    description: "Upload mannequin/dress form reference images",
    helpText: "Upload reference images of mannequins and dress forms. These will be available for selection when converting model photos to mannequin displays.",
  },
  background: {
    label: "Backgrounds",
    icon: ImageIcon,
    description: "Upload custom backgrounds for AI-generated photos",
    helpText: "Background images are used as studio settings for your AI-generated photos. Upload indoor/outdoor scenes, textured walls, or studio backdrops.",
  },
};

const UploadPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<UploadTab>("fabric");

  // Dialog state
  const [bgDialogOpen, setBgDialogOpen] = useState(false);
  const [mannequinDialogOpen, setMannequinDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const config = tabConfig[activeTab];
  const { backgroundImages, uploadBackgrounds, deleteBackground } = useBackgroundImages();
  const { mannequinImages, uploadMannequins, deleteMannequin } = useMannequinImages();

  // Fetch fabric images
  const { data: fabricImages = [] } = useQuery({
    queryKey: ["fabric_images", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fabric_images")
        .select("*")
        .eq("user_id", user!.id)
        .eq("upload_type", "fabric")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch model photos (mannequin upload type)
  const { data: modelPhotos = [] } = useQuery({
    queryKey: ["model_photos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fabric_images")
        .select("*")
        .eq("user_id", user!.id)
        .eq("upload_type", "mannequin")
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

        const { error: uploadError } = await supabase.storage.from("fabric-images").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("fabric-images").getPublicUrl(filePath);
        const { data: fabricData, error: insertError } = await supabase
          .from("fabric_images")
          .insert({ user_id: user.id, image_url: urlData.publicUrl, file_name: file.name, upload_type: "fabric" })
          .select()
          .single();
        if (insertError) throw insertError;

        if (fabricData) {
          triggerGeneration(fabricData.id, urlData.publicUrl, backgroundUrl, "fabric", null);
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

  // Upload model photos with chosen mannequin + background
  const uploadModelWithMannequin = async (files: File[], mannequinUrl: string | null, backgroundUrl: string | null) => {
    if (!user) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("fabric-images").upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("fabric-images").getPublicUrl(filePath);
        const { data: fabricData, error: insertError } = await supabase
          .from("fabric_images")
          .insert({ user_id: user.id, image_url: urlData.publicUrl, file_name: file.name, upload_type: "mannequin" })
          .select()
          .single();
        if (insertError) throw insertError;

        if (fabricData) {
          triggerGeneration(fabricData.id, urlData.publicUrl, backgroundUrl, "mannequin", mannequinUrl);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["model_photos"] });
      toast({ title: "Upload complete!", description: "AI mannequin conversion has started." });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const triggerGeneration = async (
    fabricId: string,
    imageUrl: string,
    backgroundImageUrl: string | null,
    uploadType: "fabric" | "mannequin",
    mannequinImageUrl: string | null
  ) => {
    try {
      const response = await supabase.functions.invoke("generate-content", {
        body: { fabricId, imageUrl, backgroundImageUrl, uploadType, mannequinImageUrl },
      });
      if (response.error) {
        // Handle 409 (fabric deleted during generation) — partial success is possible
        const errorBody = typeof response.error === "object" ? response.error : null;
        const errorMessage = (errorBody as any)?.message || (errorBody as any)?.context?.body
          ? "The source image was removed while generating. Please re-upload and try again."
          : "Content generation failed";
        console.warn("Generation error:", response.error);
        toast({ title: "Generation issue", description: errorMessage, variant: "destructive" });
      }
      // Always refresh — partial content may have been saved
      queryClient.invalidateQueries({ queryKey: ["generated_content"] });
    } catch (err: any) {
      console.error("Failed to trigger generation:", err);
      toast({ title: "Generation failed", description: err.message || "Something went wrong", variant: "destructive" });
    }
  };

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from("fabric_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fabric_images"] });
      queryClient.invalidateQueries({ queryKey: ["model_photos"] });
      toast({ title: "Image deleted" });
    },
  });

  // Handle file selection based on active tab
  const handleFilesSelected = (files: File[]) => {
    if (activeTab === "fabric") {
      setPendingFiles(files);
      setBgDialogOpen(true);
    } else if (activeTab === "mannequin") {
      setPendingFiles(files);
      setMannequinDialogOpen(true);
    } else if (activeTab === "mannequin-library") {
      uploadMannequins.mutate(files);
    } else {
      uploadBackgrounds.mutate(files);
    }
  };

  // Fabric: background selected
  const handleBackgroundSelected = (backgroundUrl: string | null) => {
    setBgDialogOpen(false);
    uploadFabricWithBackground(pendingFiles, backgroundUrl);
    setPendingFiles([]);
  };

  // Mannequin: mannequin + background selected
  const handleMannequinConfirmed = (mannequinUrl: string | null, backgroundUrl: string | null) => {
    setMannequinDialogOpen(false);
    uploadModelWithMannequin(pendingFiles, mannequinUrl, backgroundUrl);
    setPendingFiles([]);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      handleFilesSelected(files);
    },
    [activeTab, uploadBackgrounds, uploadMannequins]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    handleFilesSelected(files);
    e.target.value = "";
  };

  const isUploading = uploading || uploadBackgrounds.isPending || uploadMannequins.isPending;

  // Gallery config per tab
  const galleryConfig: Record<Exclude<UploadTab, "multi-fabric">, { title: string; images: any[]; onDelete: (id: string) => void }> = {
    fabric: { title: "Uploaded Fabrics", images: fabricImages, onDelete: (id) => deleteImageMutation.mutate(id) },
    mannequin: { title: "Uploaded Model Photos", images: modelPhotos, onDelete: (id) => deleteImageMutation.mutate(id) },
    "mannequin-library": { title: "Mannequin Library", images: mannequinImages, onDelete: (id) => deleteMannequin.mutate(id) },
    background: { title: "Uploaded Backgrounds", images: backgroundImages, onDelete: (id) => deleteBackground.mutate(id) },
  };

  const gallery = activeTab !== "multi-fabric" ? galleryConfig[activeTab] : null;

  const dropZoneLabel = {
    fabric: "fabric",
    mannequin: "model",
    "mannequin-library": "mannequin",
    background: "background",
    "multi-fabric": "labeled fabric",
  }[activeTab];

  const uploadingLabel = {
    fabric: "Uploading & generating...",
    mannequin: "Uploading & converting to mannequin...",
    "mannequin-library": "Uploading...",
    background: "Uploading...",
    "multi-fabric": "Processing...",
  }[activeTab];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Upload Images</h1>
          <p className="text-muted-foreground mb-6">{config.description}</p>
        </motion.div>

        {/* Tab selector */}
        <div className="flex flex-wrap gap-2 mb-6">
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

        {/* Info box — hide for multi-fabric since it has its own */}
        {activeTab !== "multi-fabric" && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4 mb-6 border-l-4 border-l-primary"
          >
            <p className="text-sm text-foreground leading-relaxed">💡 {config.helpText}</p>
          </motion.div>
        )}

        {/* Multi-fabric tab gets its own component */}
        {activeTab === "multi-fabric" ? (
          <MultiFabricTab />
        ) : (
          <>
            {/* Drop zone */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-foreground font-medium">{uploadingLabel}</p>
                    {(activeTab === "fabric" || activeTab === "mannequin") && (
                      <p className="text-sm text-muted-foreground">
                        {activeTab === "mannequin"
                          ? "AI is converting model to mannequin display"
                          : "AI is creating model images and captions"}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-1">
                      Drag and drop your {dropZoneLabel} images here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, WebP up to 20MB</p>
                    <label>
                      <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                      <Button variant="outline" asChild>
                        <span className="cursor-pointer">Browse Files</span>
                      </Button>
                    </label>
                  </>
                )}
              </div>
            </motion.div>

            {/* Gallery */}
            {gallery && <ImageGallery title={gallery.title} images={gallery.images} onDelete={gallery.onDelete} />}
          </>
        )}
      </div>

      {/* Background selection dialog — for fabric uploads */}
      <BackgroundSelectDialog
        open={bgDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setBgDialogOpen(false); setPendingFiles([]); }
        }}
        backgrounds={backgroundImages}
        onConfirm={handleBackgroundSelected}
      />

      {/* Mannequin + Background selection dialog — for model-to-mannequin uploads */}
      <MannequinBackgroundSelectDialog
        open={mannequinDialogOpen}
        onOpenChange={(open) => {
          if (!open) { setMannequinDialogOpen(false); setPendingFiles([]); }
        }}
        mannequins={mannequinImages}
        backgrounds={backgroundImages}
        onConfirm={handleMannequinConfirmed}
      />
    </AppLayout>
  );
};

export default UploadPage;
