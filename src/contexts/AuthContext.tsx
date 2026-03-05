import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  email: string;
  photo_url: string | null;
  plano: string;
  status_assinatura: string | null;
  data_expiracao: string | null;
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

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as unknown as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Initial check for recovery mode in URL
    const checkInitialRecovery = () => {
      const hash = window.location.hash;
      const isRecovery = hash && (hash.includes("type=recovery") || hash.includes("access_token="));
      if (isRecovery) {
        setIsRecovering(true);
        return true;
      }
      return false;
    };

    const isInitialRecovery = checkInitialRecovery();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth Event:", event);
        
        // SECURITY: If it's a recovery event, force isRecovering to true
        if (event === "PASSWORD_RECOVERY") {
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
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isInitialRecovery || (window.location.hash && window.location.hash.includes("type=recovery"))) {
        setIsRecovering(true);
        setSession(null);
        setUser(null);
        setProfile(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isRecovering]);

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

    // Se o usuário foi criado com sucesso e temos o ID
    if (data.user) {
      // Pequeno delay para permitir que o trigger do Supabase tente criar o perfil primeiro
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verifica se o perfil já foi criado pelo trigger
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", data.user.id)
        .single();

      // Se o perfil não existe, cria manualmente (fallback)
      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              user_id: data.user.id,
              name: name,
              email: email,
              plano: 'trial',
              status_assinatura: 'active',
              data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]);
        
        if (profileError) {
          console.error("Erro ao criar perfil manualmente:", profileError);
          // Não lançamos erro aqui para não travar o fluxo de signup se o auth funcionou
        }
      }
      
      // Atualiza o estado local
      await fetchProfile(data.user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
    setIsRecovering(false);
  };

  const isAdmin = profile?.email === ADMIN_EMAIL;

  const hasAccess = (() => {
    if (!profile) return false;
    if (isAdmin) return true;
    const expDate = profile.data_expiracao ? new Date(profile.data_expiracao) : null;
    const now = new Date();
    if (expDate && expDate > now) return true;
    return false;
  })();

  const isReadOnly = (() => {
    if (!profile) return false;
    if (isAdmin) return false;
    if (hasAccess) return false;
    const status = profile.status_assinatura;
    if (status === "blocked") return false;
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
