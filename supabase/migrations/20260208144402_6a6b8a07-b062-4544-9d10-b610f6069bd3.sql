-- Create mannequin_images table for storing mannequin/dress form reference images
CREATE TABLE public.mannequin_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  file_name text NOT NULL DEFAULT ''::text,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mannequin_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own mannequin images"
ON public.mannequin_images FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mannequin images"
ON public.mannequin_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mannequin images"
ON public.mannequin_images FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for mannequin images
INSERT INTO storage.buckets (id, name, public) VALUES ('mannequin-images', 'mannequin-images', true);

-- Storage policies
CREATE POLICY "Users can upload mannequin images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mannequin-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view mannequin images"
ON storage.objects FOR SELECT
USING (bucket_id = 'mannequin-images');

CREATE POLICY "Users can delete own mannequin images"
ON storage.objects FOR DELETE
USING (bucket_id = 'mannequin-images' AND auth.uid()::text = (storage.foldername(name))[1]);