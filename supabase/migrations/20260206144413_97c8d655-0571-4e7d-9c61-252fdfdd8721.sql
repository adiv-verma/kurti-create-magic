
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', '')
  );
  RETURN NEW;
END;
$function$;

-- Also fix existing profiles: update the kurtishop user's business name
UPDATE public.profiles
SET business_name = 'KurtiTestShop'
WHERE email = 'kurtishop@test.com' AND business_name = '';

UPDATE public.profiles
SET business_name = 'TestFashionBrand'
WHERE email = 'testfashion@example.com' AND business_name = '';
