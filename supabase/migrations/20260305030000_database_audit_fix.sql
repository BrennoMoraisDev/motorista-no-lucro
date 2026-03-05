-- Audit and fix profiles table structure
-- Problem 3: Ensure all expected fields exist with correct types

-- Add missing columns if they don't exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT,
  ADD COLUMN IF NOT EXISTS data_expiracao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_assinatura TIMESTAMPTZ DEFAULT now();

-- Problem 3: Ensure email is unique for security and consistency
-- First, ensure there are no duplicates (this might fail if there are duplicates already)
-- In a real scenario, we would need to handle duplicates before applying this.
-- For the purpose of the audit, we assume the user wants this constraint.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Create index on email for faster lookups (used by webhook)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Ensure user_id is unique (already is, but good to double check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Problem 8: Update trigger function to use 7 days trial and new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'brennomoraisdev@gmail.com' THEN
    INSERT INTO public.profiles (user_id, name, email, plano, status_assinatura, data_expiracao, start_assinatura)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      'premium',
      'active',
      NULL,
      now()
    );
  ELSE
    -- Problem 4 & 8: 7 days trial
    INSERT INTO public.profiles (user_id, name, email, plano, status_assinatura, data_expiracao, start_assinatura)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      NEW.email,
      'trial',
      'active',
      now() + interval '7 days',
      now()
    );
  END IF;
  RETURN NEW;
END;
$function$;
