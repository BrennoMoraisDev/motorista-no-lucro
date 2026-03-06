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

  // Função para verificar e atualizar plano expirado
  const checkAndUpdateExpiredPlan = (prof: Profile): Profile => {
    if (prof.plano === "premium" && prof.premium_expira_em) {
      const expiryDate = new Date(prof.premium_expira_em);
      const now = new Date();
      
      if (expiryDate < now) {
        console.log("⚠️ Plano premium expirado. Rebaixando para free.");
        return { ...prof, plano: "free" };
      }
    }
    return prof;
  };

  const fetchProfile = async (userId: string) => {
    try {
      console.log(`📥 Buscando perfil para user_id: ${userId}`);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (error) {
        console.error("❌ Erro ao buscar perfil:", error);
        setProfile(null);
        return;
      }
      
      if (data) {
        const updatedProfile = checkAndUpdateExpiredPlan(data as unknown as Profile);
        console.log("✅ Perfil carregado:", updatedProfile);
        setProfile(updatedProfile);
      } else {
        console.warn("⚠️ Perfil não encontrado para este usuário");
        setProfile(null);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar perfil:", err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    console.log("🔄 AuthProvider inicializando...");
    
    // Initial check for recovery mode in URL
    const checkInitialRecovery = () => {
      const hash = window.location.hash;
      const isRecovery = hash && (hash.includes("type=recovery") || hash.includes("access_token="));
      if (isRecovery) {
        console.log("🔐 Modo de recuperação detectado");
        setIsRecovering(true);
        return true;
      }
      return false;
    };

    const isInitialRecovery = checkInitialRecovery();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth Event:", event, "Session:", session?.user?.email);
        
        // SECURITY: If it's a recovery event, force isRecovering to true
        if (event === "PASSWORD_RECOVERY") {
          console.log("🔐 Evento de recuperação de senha detectado");
          setIsRecovering(true);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // If we are in recovery mode (detected by URL or event), 
        // we MUST NOT set the user/session for the rest of the app
        if (isRecovering || (window.location.hash && window.location.hash.includes("type=recovery"))) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log("👤 Usuário autenticado:", session.user.email);
          await fetchProfile(session.user.id);
        } else {
          console.log("👤 Nenhum usuário autenticado");
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Initial session fetch
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("📋 Sessão inicial:", session?.user?.email || "Nenhuma");
        
        if (isInitialRecovery || (window.location.hash && window.location.hash.includes("type=recovery"))) {
          setIsRecovering(true);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            console.log("👤 Carregando perfil da sessão inicial");
            await fetchProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("❌ Erro ao buscar sessão inicial:", err);
        setLoading(false);
      }
    })();

    return () => subscription.unsubscribe();
  }, [isRecovering]);

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
      
      console.log("📝 Resultado do signup:", { user: data.user?.id, error });
      
      if (error) {
        console.error("❌ Erro no signup:", error);
        throw error;
      }

      // Se o usuário foi criado com sucesso e temos o ID
      if (data.user) {
        console.log("✅ Usuário criado em auth.users:", data.user.id);
        
        // Pequeno delay para permitir que o trigger do Supabase tente criar o perfil primeiro
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verifica se o perfil já foi criado pelo trigger
        const { data: existingProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        console.log("🔍 Verificando perfil existente:", { exists: !!existingProfile, error: fetchError });

        // Se o perfil não existe, cria manualmente (fallback)
        if (!existingProfile && !fetchError) {
          console.log("📝 Criando perfil manualmente...");
          
          // Determinar o plano baseado no email
          const isAdmin = email === ADMIN_EMAIL;
          const plano = isAdmin ? "premium" : "free";
          const premiumExpiraEm = isAdmin 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 ano para admin
            : null;
          
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([
              {
                user_id: data.user.id,
                name: name,
                email: email,
                plano: plano,
                premium_expira_em: premiumExpiraEm,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);
          
          if (profileError) {
            console.error("❌ Erro ao criar perfil manualmente:", profileError);
          } else {
            console.log("✅ Perfil criado com sucesso em profiles");
          }
        }
        
        // Atualiza o estado local
        await fetchProfile(data.user.id);
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
    
    const expDate = profile.premium_expira_em ? new Date(profile.premium_expira_em) : null;
    const now = new Date();
    
    if (profile.plano === "premium" && expDate && expDate > now) return true;
    if (profile.plano === "free") return true; // Free users têm acesso básico
    
    return false;
  })();

  const isReadOnly = (() => {
    if (!profile) return false;
    if (isAdmin) return false;
    if (profile.plano === "premium") {
      const expDate = profile.premium_expira_em ? new Date(profile.premium_expira_em) : null;
      const now = new Date();
      if (expDate && expDate > now) return false;
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
