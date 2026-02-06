
-- Create a table for tracking background images
CREATE TABLE public.background_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.background_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own background images
CREATE POLICY "Users can view their own background images"
ON public.background_images
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own background images
CREATE POLICY "Users can insert their own background images"
ON public.background_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own background images
CREATE POLICY "Users can delete their own background images"
ON public.background_images
FOR DELETE
USING (auth.uid() = user_id);
