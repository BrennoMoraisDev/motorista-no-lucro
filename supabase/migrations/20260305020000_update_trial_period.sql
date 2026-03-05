-- Update the trigger function to set trial to 7 days
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'brennomoraisdev@gmail.com' THEN
    INSERT INTO public.profiles (user_id, name, email, plano, status_assinatura, data_expiracao)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      'premium',
      'active',
      NULL
    );
  ELSE
    -- Problem 8: Step 240-250 - Alter to 7 days trial
    INSERT INTO public.profiles (user_id, name, email, plano, status_assinatura, data_expiracao)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      'trial',
      'active',
      now() + interval '7 days'
    );
  END IF;
  RETURN NEW;
END;
$function$;
