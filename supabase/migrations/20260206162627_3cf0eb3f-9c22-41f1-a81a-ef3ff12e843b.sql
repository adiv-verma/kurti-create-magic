
-- Add column to track which background image was used for each generated content
ALTER TABLE public.generated_content
ADD COLUMN background_image_url TEXT DEFAULT NULL;
