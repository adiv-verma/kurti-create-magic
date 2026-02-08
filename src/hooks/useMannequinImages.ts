import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface MannequinImage {
  id: string;
  user_id: string;
  image_url: string;
  file_name: string;
  uploaded_at: string;
}

export const useMannequinImages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mannequinImages = [], isLoading } = useQuery({
    queryKey: ["mannequin_images", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mannequin_images")
        .select("*")
        .eq("user_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as MannequinImage[];
    },
    enabled: !!user,
  });

  const uploadMannequins = useMutation({
    mutationFn: async (files: File[]) => {
      if (!user) throw new Error("Not authenticated");

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("mannequin-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("mannequin-images")
          .getPublicUrl(filePath);

        const { error: insertError } = await supabase
          .from("mannequin_images")
          .insert({
            user_id: user.id,
            image_url: urlData.publicUrl,
            file_name: file.name,
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mannequin_images"] });
      toast({ title: "Upload complete!", description: "Mannequin images saved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMannequin = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from("mannequin_images").delete().eq("id", imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mannequin_images"] });
      toast({ title: "Mannequin image deleted" });
    },
  });

  return {
    mannequinImages,
    isLoading,
    uploadMannequins,
    deleteMannequin,
  };
};
