import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface BackgroundImage {
  id: string;
  user_id: string;
  image_url: string;
  file_name: string;
  uploaded_at: string;
}

export const useBackgroundImages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: backgroundImages = [], isLoading } = useQuery({
    queryKey: ["background_images", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("background_images")
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as BackgroundImage[];
    },
    enabled: !!user,
  });

  const uploadBackgrounds = useMutation({
    mutationFn: async (files: File[]) => {
      if (!user) throw new Error("Not authenticated");

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("background-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("background-images")
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from("background_images")
          .insert({
            user_id: user.id,
            image_url: urlData.publicUrl,
            file_name: file.name,
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["background_images"] });
      toast({ title: "Upload complete!", description: "Background images saved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteBackground = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from("background_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["background_images"] });
      toast({ title: "Background image deleted" });
    },
  });

  return {
    backgroundImages,
    isLoading,
    uploadBackgrounds,
    deleteBackground,
  };
};
