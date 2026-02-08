
-- Create reels table to track generated Instagram reel videos
CREATE TABLE public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_id UUID NOT NULL REFERENCES public.generated_content(id) ON DELETE CASCADE,
  voiceover_url TEXT,
  music_url TEXT,
  video_url TEXT,
  caption_english TEXT,
  caption_hindi TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating_audio', 'generating_video', 'ready', 'posted', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reels"
  ON public.reels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reels"
  ON public.reels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels"
  ON public.reels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels"
  ON public.reels FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_reels_updated_at
  BEFORE UPDATE ON public.reels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
