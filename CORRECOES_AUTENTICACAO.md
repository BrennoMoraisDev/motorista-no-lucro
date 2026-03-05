# Correções de Autenticação - Motorista no Lucro

## Problema Identificado

O fluxo de signup não estava criando usuários em `auth.users` e nem registros na tabela `profiles` no Supabase, mesmo com o deploy funcionando na Vercel.

### Causas Raiz

1. **Variáveis de Ambiente Incorretas**: O cliente Supabase estava usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, mas a Vercel estava configurando `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

2. **Falta de Fallback**: Não havia fallback para as variáveis de ambiente, causando que o cliente Supabase não conseguisse se conectar corretamente.

3. **Falta de Tratamento de Erro no Trigger**: O trigger `on_auth_user_created` pode falhar silenciosamente se houver problemas com RLS ou permissões, deixando o usuário criado mas sem perfil.

4. **Falta de Sincronização**: Não havia mecanismo para garantir que o perfil fosse criado mesmo se o trigger falhasse.

## Correções Implementadas

### 1. Atualizar Cliente Supabase (`src/integrations/supabase/client.ts`)

**Antes:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

**Depois:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

**Benefício**: Agora o cliente Supabase funciona tanto com variáveis de ambiente do Vite quanto do Next.js/Vercel.

### 2. Melhorar Função `signUp` no AuthContext (`src/contexts/AuthContext.tsx`)

**Mudanças Principais:**

- Adicionado `emailRedirectTo` para melhor experiência de email de confirmação
- Implementado delay de 1 segundo para permitir que o trigger do Supabase tente criar o perfil primeiro
- Adicionado verificação se o perfil já foi criado pelo trigger
- Implementado fallback manual para criar o perfil se o trigger falhar
- Adicionado atualização do estado local com `fetchProfile` após criação bem-sucedida

**Fluxo Agora:**

1. Chama `supabase.auth.signUp()` com email, senha e nome
2. Se sucesso, aguarda 1 segundo
3. Verifica se o perfil foi criado pelo trigger
4. Se não foi criado, cria manualmente com dados padrão (trial, 7 dias)
5. Atualiza o estado local do contexto
6. Navega para o dashboard

### 3. Verificar Configuração do Supabase

**Requisitos no Supabase:**

- ✅ Trigger `on_auth_user_created` deve existir e estar ativo
- ✅ Função `handle_new_user()` deve estar correta
- ✅ RLS deve estar desativado na tabela `profiles` (conforme informado)
- ✅ Tabela `profiles` deve ter as colunas corretas com tipos apropriados

**Verificar se o trigger está funcionando:**

```sql
-- No Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'seu-email@teste.com';
SELECT * FROM profiles WHERE email = 'seu-email@teste.com';
```

## Variáveis de Ambiente Necessárias na Vercel

```
NEXT_PUBLIC_SUPABASE_URL=https://lhrnhgmoebbtzopdsjgt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxocm5oZ21vZWJidHpvcGRzamd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NjA0MzcsImV4cCI6MjA4NzQzNjQzN30.IhItZqD8WkOVxt1JxMbRHPrp8kjU1rL-pd4rU4MXD3A
SUPABASE_SECRET_KEY=<sua-chave-secreta>
```

## Teste de Validação

Para validar que as correções funcionam:

1. **Frontend**: Tente criar uma conta nova em `https://seu-app.vercel.app/register`
2. **Supabase Console**: Verifique se o usuário aparece em `Authentication > Users`
3. **Supabase Console**: Verifique se o registro aparece em `profiles` table
4. **Frontend**: Verifique se consegue fazer login e acessar o dashboard

## Logs para Debug

Se ainda houver problemas, verifique os logs:

- **Browser Console**: Procure por erros de conexão com Supabase
- **Vercel Logs**: Verifique se há erros durante o build ou runtime
- **Supabase Logs**: Verifique `Logs` > `Edge Functions` para erros de trigger

## Próximos Passos Recomendados

1. ✅ Fazer deploy das mudanças para a Vercel
2. ✅ Testar o fluxo completo de signup
3. ✅ Monitorar os logs para garantir que tudo está funcionando
4. ✅ Considerar adicionar mais logging no AuthContext para facilitar debug futuro

## Mudanças de Arquivo

- `src/integrations/supabase/client.ts` - Atualizado com fallback de variáveis
- `src/contexts/AuthContext.tsx` - Melhorado fluxo de signup com fallback
