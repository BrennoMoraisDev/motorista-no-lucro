-- Correção da lógica de Trial de 7 dias e unificação de colunas
-- Este script garante que novos usuários recebam 7 dias de trial e que a coluna data_expiracao seja usada consistentemente.

-- 1. Garantir que a coluna se chama data_expiracao (revertendo se necessário ou garantindo existência)
DO $$ 
BEGIN
    -- Se a coluna premium_expira_em existir (vinda da migração 20260306), renomeia de volta para data_expiracao
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'premium_expira_em') THEN
        ALTER TABLE public.profiles RENAME COLUMN premium_expira_em TO data_expiracao;
    END IF;
END $$;

-- 2. Atualizar a função handle_new_user para conceder 7 dias de trial
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
    -- Concede 7 dias de trial para novos usuários
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
