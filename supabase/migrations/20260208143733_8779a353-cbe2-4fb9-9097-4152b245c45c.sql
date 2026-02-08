-- Add upload_type column to fabric_images to distinguish fabric swatches from mannequin/model photos
ALTER TABLE public.fabric_images 
ADD COLUMN upload_type text NOT NULL DEFAULT 'fabric';

-- Add a check constraint for valid values
CREATE OR REPLACE FUNCTION public.validate_upload_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.upload_type NOT IN ('fabric', 'mannequin') THEN
    RAISE EXCEPTION 'upload_type must be fabric or mannequin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_fabric_upload_type
BEFORE INSERT OR UPDATE ON public.fabric_images
FOR EACH ROW
EXECUTE FUNCTION public.validate_upload_type();