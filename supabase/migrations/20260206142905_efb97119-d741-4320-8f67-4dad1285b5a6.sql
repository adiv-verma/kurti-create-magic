
-- Create content status enum
CREATE TYPE public.content_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fabric_images table
CREATE TABLE public.fabric_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_content table
CREATE TABLE public.generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fabric_id UUID NOT NULL REFERENCES public.fabric_images(id) ON DELETE CASCADE,
  model_image_url TEXT,
  caption_hindi TEXT,
  caption_english TEXT,
  status content_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Fabric images RLS policies
CREATE POLICY "Users can view own fabric images"
  ON public.fabric_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fabric images"
  ON public.fabric_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fabric images"
  ON public.fabric_images FOR DELETE
  USING (auth.uid() = user_id);

-- Generated content RLS policies
CREATE POLICY "Users can view own generated content"
  ON public.generated_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated content"
  ON public.generated_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated content"
  ON public.generated_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated content"
  ON public.generated_content FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('fabric-images', 'fabric-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('background-images', 'background-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-images', 'generated-images', true);

-- Storage RLS policies for fabric-images
CREATE POLICY "Users can upload own fabric images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fabric-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own fabric images storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fabric-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own fabric images storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'fabric-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS policies for background-images
CREATE POLICY "Users can upload own background images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'background-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own background images storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'background-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own background images storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'background-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS policies for generated-images (public read for AI-generated content)
CREATE POLICY "Anyone can view generated images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "Authenticated users can upload generated images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'generated-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own generated images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, business_name)
  VALUES (NEW.id, NEW.email, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_content_updated_at
  BEFORE UPDATE ON public.generated_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
