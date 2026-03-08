import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  plano: string;
  premium_expira_em: string | null;
  created_at: string;
  updated_at: string;
}

const ADMIN_EMAIL = "brennomoraisdev@gmail.com";
const LOADING_TIMEOUT = 3000; // 3 segundos de timeout

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  hasAccess: boolean;
  isReadOnly: boolean;
  isAdmin: boolean;
  isRecovering: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  // Função para criar perfil automaticamente se não existir
  const ensureProfileExists = async (userId: string, email: string, name: string = "") => {
    try {
      console.log(`🔍 Verificando se perfil existe para user_id: ${userId}`);
      
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (existingProfile) {
        console.log("✅ Perfil já existe:", existingProfile);
        return existingProfile;
      }

      // Se não existe, criar automaticamente
      if (fetchError && fetchError.code === "PGRST116") {
        console.log("📝 Perfil não encontrado. Criando automaticamente...");
        
        const isAdmin = email === ADMIN_EMAIL;
        const newProfile = {
          user_id: userId,
          name: name || email.split("@")[0],
          email: email,
          plano: isAdmin ? "premium" : "free",
          premium_expira_em: isAdmin 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          console.error("❌ Erro ao criar perfil:", createError);
          return null;
        }

        console.log("✅ Perfil criado com sucesso:", createdProfile);
        return createdProfile;
      }

      if (fetchError) {
        console.error("❌ Erro ao buscar perfil:", fetchError);
        return null;
      }

      return null;
    } catch (err) {
      console.error("❌ Erro em ensureProfileExists:", err);
      return null;
    }
  };

  // Função para buscar e atualizar perfil
  const fetchProfile = async (userId: string, email: string = "", name: string = "") => {
    try {
      console.log(`📥 Buscando perfil para user_id: ${userId}`);
      
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("❌ Erro ao buscar perfil:", error);
        // Continuar execução mesmo com erro
        return null;
      }

      if (profile) {
        console.log("✅ Perfil encontrado:", profile);
        setProfile(profile as unknown as Profile);
        return profile;
      }

      // Se não encontrou, tentar criar automaticamente
      console.log("⚠️ Perfil não encontrado. Tentando criar...");
      const createdProfile = await ensureProfileExists(userId, email, name);
      if (createdProfile) {
        setProfile(createdProfile as unknown as Profile);
        return createdProfile;
      }

      console.warn("⚠️ Não foi possível criar perfil");
      setProfile(null);
      return null;
    } catch (err) {
      console.error("❌ Erro em fetchProfile:", err);
      setProfile(null);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email || "", user.user_metadata?.name || "");
    }
  };

  useEffect(() => {
    console.log("🔄 AuthProvider inicializando...");
    
    let loadingTimeout: NodeJS.Timeout | null = null;
    let isComponentMounted = true;
    let hasInitialized = false; // Guard para evitar múltiplas inicializações

    // Timeout de segurança: se loading durar mais de 3 segundos, forçar false
    const startLoadingTimeout = () => {
      loadingTimeout = setTimeout(() => {
        if (isComponentMounted) {
          console.warn("⚠️ Timeout de loading atingido. Forçando setLoading(false)");
          setLoading(false);
        }
      }, LOADING_TIMEOUT);
    };

    const clearLoadingTimeout = () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
    };

    // Iniciar timeout
    startLoadingTimeout();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth Event:", event);
        console.log("session:", session?.user?.email || "null");

        if (event === "PASSWORD_RECOVERY") {
          console.log("🔐 Modo de recuperação de senha detectado");
          if (isComponentMounted) {
            setIsRecovering(true);
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            clearLoadingTimeout();
          }
          return;
        }

        // Evitar atualizações desnecessárias se a sessão não mudou
        if (isComponentMounted) {
          const userChanged = session?.user?.id !== user?.id;
          
          if (userChanged || event === "SIGNED_IN" || event === "SIGNED_OUT") {
            console.log("🔄 Sessão alterada, atualizando estado");
            setSession(session);
            setUser(session?.user ?? null);
            console.log("user:", session?.user?.id || "null");

            if (session?.user) {
              console.log("👤 Usuário autenticado:", session.user.email);
              await fetchProfile(
                session.user.id,
                session.user.email || "",
                session.user.user_metadata?.name || ""
              );
            } else {
              console.log("👤 Nenhum usuário autenticado");
              setProfile(null);
            }
          }

          setLoading(false);
          clearLoadingTimeout();
        }
      }
    );

    // Buscar sessão inicial (apenas uma vez)
    if (!hasInitialized) {
      hasInitialized = true;
      
      (async () => {
        try {
          console.log("📋 Buscando sessão inicial...");
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error("❌ Erro ao buscar sessão:", error);
            if (isComponentMounted) {
              setLoading(false);
              clearLoadingTimeout();
            }
            return;
          }

          console.log("session:", session?.user?.email || "null");

          if (isComponentMounted) {
            setSession(session);
            setUser(session?.user ?? null);
            console.log("user:", session?.user?.id || "null");

            if (session?.user) {
              console.log("👤 Carregando perfil da sessão inicial");
              const prof = await fetchProfile(
                session.user.id,
                session.user.email || "",
                session.user.user_metadata?.name || ""
              );
              console.log("profile:", prof || "null");
            } else {
              console.log("👤 Sem sessão ativa");
              setProfile(null);
            }

            setLoading(false);
            clearLoadingTimeout();
          }
        } catch (err) {
          console.error("❌ Erro ao buscar sessão inicial:", err);
          if (isComponentMounted) {
            setLoading(false);
            clearLoadingTimeout();
          }
        }
      })();
    }

    // Cleanup
    return () => {
      isComponentMounted = false;
      clearLoadingTimeout();
      subscription.unsubscribe();
    };
  }, [user?.id]); // Adicionar user?.id como dependência para evitar loops

  const signUp = async (name: string, email: string, password: string) => {
    try {
      console.log("📝 Iniciando signup para:", email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/dashboard`
        },
      });

      if (error) {
        console.error("❌ Erro no signup:", error);
        throw error;
      }

      if (data.user) {
        console.log("✅ Usuário criado em auth.users:", data.user.id);

        // Aguardar um pouco para permitir que o trigger do Supabase execute
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Garantir que o perfil existe
        await ensureProfileExists(data.user.id, email, name);
      }
    } catch (err) {
      console.error("❌ Erro geral no signup:", err);
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Iniciando login para:", email);

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("❌ Erro no login:", error);
        throw error;
      }

      console.log("✅ Login realizado com sucesso");
    } catch (err) {
      console.error("❌ Erro geral no login:", err);
      throw err;
    }
  };

  const signOut = async () => {
    console.log("🚪 Realizando logout...");
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
    setIsRecovering(false);
    console.log("✅ Logout realizado");
  };

  const isAdmin = profile?.email === ADMIN_EMAIL;

  const hasAccess = (() => {
    if (!profile) return false;
    if (isAdmin) return true;
    if (profile.plano === "free") return true;
    
    if (profile.plano === "premium" && profile.premium_expira_em) {
      const expDate = new Date(profile.premium_expira_em);
      const now = new Date();
      if (expDate > now) return true;
    }
    
    return false;
  })();

  const isReadOnly = (() => {
    if (!profile) return false;
    if (isAdmin) return false;
    if (profile.plano === "premium" && profile.premium_expira_em) {
      const expDate = new Date(profile.premium_expira_em);
      const now = new Date();
      if (expDate > now) return false;
    }
    return true;
  })();

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, hasAccess, isReadOnly, isAdmin, isRecovering,
      signUp, signIn, signOut, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
