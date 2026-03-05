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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.email === ADMIN_EMAIL;

  const hasAccess = (() => {
    if (!profile) return false;
    if (isAdmin) return true;
    const expDate = profile.data_expiracao ? new Date(profile.data_expiracao) : null;
    const now = new Date();
    // Access granted if expiration date is in the future, regardless of status
    // This ensures canceled users keep access until their paid period ends
    if (expDate && expDate > now) return true;
    // Admin email without expiration = lifetime access (handled above)
    return false;
  })();

  // Read-only: expired but not blocked — can view data but not write
  const isReadOnly = (() => {
    if (!profile) return false;
    if (isAdmin) return false;
    if (hasAccess) return false;
    
    // Problem 8: Step 257-262 - When trial expires, update to free/read-only
    const status = profile.status_assinatura;
    // blocked accounts get no access at all
    if (status === "blocked") return false;
    return true; // expired trial, expired active, expired canceled
  })();

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, hasAccess, isReadOnly, isAdmin, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
