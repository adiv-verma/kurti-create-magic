
-- Table to store multi-fabric upload jobs
CREATE TABLE public.multi_fabric_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_image_url TEXT NOT NULL,
  detected_labels JSONB DEFAULT '[]'::jsonb,
  mannequin_image_url TEXT,
  background_image_url TEXT,
  color_output_mode TEXT NOT NULL DEFAULT 'separate' CHECK (color_output_mode IN ('separate', 'combined')),
  status TEXT NOT NULL DEFAULT 'analyzing' CHECK (status IN ('analyzing', 'detected', 'generating', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store individual generated mannequin images from a multi-fabric job
CREATE TABLE public.multi_fabric_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.multi_fabric_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  color_variant TEXT,
  generated_image_url TEXT,
  caption_hindi TEXT,
  caption_english TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.multi_fabric_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_fabric_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for multi_fabric_jobs
CREATE POLICY "Users can view their own multi-fabric jobs"
ON public.multi_fabric_jobs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own multi-fabric jobs"
ON public.multi_fabric_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own multi-fabric jobs"
ON public.multi_fabric_jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own multi-fabric jobs"
ON public.multi_fabric_jobs FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for multi_fabric_results
CREATE POLICY "Users can view their own multi-fabric results"
ON public.multi_fabric_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own multi-fabric results"
ON public.multi_fabric_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own multi-fabric results"
ON public.multi_fabric_results FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own multi-fabric results"
ON public.multi_fabric_results FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_multi_fabric_jobs_updated_at
BEFORE UPDATE ON public.multi_fabric_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
