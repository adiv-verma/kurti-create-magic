-- Add approval_status to multi_fabric_results for Library workflow
ALTER TABLE public.multi_fabric_results 
ADD COLUMN approval_status public.content_status NOT NULL DEFAULT 'pending';

-- Add RLS policy so users can update their own results' approval status
CREATE POLICY "Users can update their own multi_fabric_results"
ON public.multi_fabric_results
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);