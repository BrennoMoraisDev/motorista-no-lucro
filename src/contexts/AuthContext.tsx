import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  photo_url: string | null;
  plano: string;
  status_assinatura: string | null;
  data_expiracao: string | null;
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

  const fetchProfile = useCallback(async (userId: string, email: string = "", name: string = "") => {
    try {
      console.log(`📥 Buscando perfil para user_id: ${userId}`);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        console.log("✅ Perfil encontrado:", data);
        setProfile(data as unknown as Profile);
        return data;
      }

      if (error && error.code === "PGRST116") {
        console.log("📝 Perfil não encontrado. Criando...");
        const isAdmin = email === ADMIN_EMAIL;
        
        // Calcular data de expiração (7 dias a partir de agora para novos usuários)
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        
        const newProfile = {
          user_id: userId,
          name: name || email.split("@")[0],
          email,
          plano: isAdmin ? "premium" : "free",
          status_assinatura: isAdmin ? "active" : "trial",
          data_expiracao: expirationDate.toISOString(),
        };
        
        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .insert([newProfile])
          .select()
          .single();

        if (created) {
          setProfile(created as unknown as Profile);
          return created;
        }
        if (createErr) console.error("❌ Erro ao criar perfil:", createErr);
      } else if (error) {
        console.error("❌ Erro ao buscar perfil:", error);
      }

      setProfile(null);
      return null;
    } catch (err) {
      console.error("❌ Erro em fetchProfile:", err);
      setProfile(null);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, user.email || "", user.user_metadata?.name || "");
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    console.log("🔄 AuthProvider inicializando...");
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY") {
          setIsRecovering(true);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase auth
          setTimeout(async () => {
            if (!mounted) return;
            await fetchProfile(
              currentSession.user.id,
              currentSession.user.email || "",
              currentSession.user.user_metadata?.name || ""
            );
            if (mounted) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      console.log("📋 Sessão inicial:", initialSession?.user?.email || "null");
      // The onAuthStateChange INITIAL_SESSION event will handle setting state
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("⚠️ Loading timeout - forçando false");
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []); // Empty deps - only run once

  const signUp = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/dashboard`
      },
    });
    
    if (error) throw error;

    // Se o cadastro foi bem sucedido mas a sessão é nula (email não confirmado)
    // tentamos obter a sessão atual, pois o Supabase pode ter logado o usuário
    if (data.user && !data.session) {
      console.log("📝 Cadastro realizado, verificando sessão...");
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log("✅ Sessão obtida após cadastro");
        setSession(sessionData.session);
        setUser(sessionData.session.user);
      } else {
        console.log("🔄 Tentando login automático...");
        try {
          await signIn(email, password);
        } catch (e) {
          console.warn("⚠️ Login automático falhou.");
        }
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log("🔐 Iniciando login para:", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Se houver erro, mas for apenas de email não confirmado, vamos tentar prosseguir
    if (error && error.message !== "Email not confirmed") {
      console.error("❌ Erro no login:", error);
      throw error;
    }
    
    // Tentar obter a sessão de qualquer forma
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      console.log("✅ Sessão obtida:", sessionData.session.user.email);
      setSession(sessionData.session);
      setUser(sessionData.session.user);
      return;
    }

    if (error) {
      console.error("❌ Erro no login (sem sessão):", error);
      throw error;
    }
    
    if (data.session) {
      console.log("✅ Login realizado com sucesso", data.session.user.email);
      setSession(data.session);
      setUser(data.session.user);
    } else {
      throw new Error("Não foi possível iniciar a sessão. Verifique suas credenciais.");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
    setIsRecovering(false);
  };

  const isAdmin = profile?.email === ADMIN_EMAIL;

  // Access logic: admin always has access, premium with valid expiration has access,
  // users with no expiration set and plano=premium have access (manually activated)
  const hasAccess = (() => {
    if (!profile) return false;
    if (isAdmin) return true;
    
    // If premium with expiration date, check if still valid
    if (profile.plano === "premium") {
      if (!profile.data_expiracao) return true; // No expiration = unlimited
      return new Date(profile.data_expiracao) > new Date();
    }
    
    // Trial users with valid expiration
    if (profile.status_assinatura === "trial" && profile.data_expiracao) {
      return new Date(profile.data_expiracao) > new Date();
    }
    
    return false;
  })();

  const isReadOnly = (() => {
    if (!profile) return false;
    if (isAdmin) return true; // admin has full access, not read-only
    if (hasAccess) return false;
    // Expired users get read-only
    if (profile.data_expiracao && new Date(profile.data_expiracao) <= new Date()) {
      return true;
    }
    return false;
  })();

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, hasAccess, isReadOnly: isAdmin ? false : isReadOnly, 
      isAdmin, isRecovering, signUp, signIn, signOut, refreshProfile
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
