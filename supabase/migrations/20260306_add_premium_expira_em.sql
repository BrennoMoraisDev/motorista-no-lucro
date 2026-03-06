-- Rename data_expiracao to premium_expira_em and update the trigger
ALTER TABLE public.profiles
  RENAME COLUMN data_expiracao TO premium_expira_em;

-- Update the trigger function to use the new column name
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'brennomoraisdev@gmail.com' THEN
    INSERT INTO public.profiles (user_id, name, email, plano, status_assinatura, premium_expira_em)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      'premium',
      'active',
      NULL
    );
  ELSE
    INSERT INTO public.profiles (user_id, name, email, plano, status_assinatura, premium_expira_em)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      'free',
      'active',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$function$;
