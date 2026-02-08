
-- Create storage bucket for reel audio/video files
INSERT INTO storage.buckets (id, name, public)
VALUES ('reel-assets', 'reel-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own reel assets
CREATE POLICY "Users can upload reel assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reel-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to reel assets
CREATE POLICY "Reel assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'reel-assets');

-- Allow users to update their own reel assets
CREATE POLICY "Users can update reel assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'reel-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own reel assets
CREATE POLICY "Users can delete reel assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'reel-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
