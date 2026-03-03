import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-small.webp";
import { KeyRound, CheckCircle } from "lucide-react";
import Layout from "@/components/Layout";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setValidSession(true);
    }
    // Also listen for auth state change with recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Sign out after password reset so user must log in with new password
      await supabase.auth.signOut();
      setSuccess(true);
      toast({ title: "Senha alterada!", description: "Faça login com sua nova senha." });
      setTimeout(() => navigate("/login"), 2500);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] space-y-6">
          <div className="text-center">
            <img src={logo} alt="Motorista no Lucro" width={50} height={50} className="mx-auto mb-3 h-[50px] w-auto object-contain" />
            <p className="text-sm text-muted-foreground">Redefinir senha</p>
          </div>

          <div className="rounded-3xl bg-card p-8 shadow-lg border border-border">
            {success ? (
              <div className="space-y-4 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-primary" />
                <h1 className="text-2xl font-bold text-card-foreground font-display">Senha redefinida!</h1>
                <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
              </div>
            ) : !validSession ? (
              <div className="space-y-4 text-center">
                <KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
                <h1 className="text-xl font-bold text-card-foreground font-display">Link inválido ou expirado</h1>
                <p className="text-sm text-muted-foreground">
                  Solicite um novo link de recuperação.
                </p>
                <Button variant="outline" onClick={() => navigate("/forgot-password")} className="rounded-xl">
                  Solicitar novo link
                </Button>
              </div>
            ) : (
              <>
                <h1 className="mb-6 text-2xl font-bold text-card-foreground font-display">
                  Nova senha
                </h1>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="rounded-xl border-border px-3 py-3 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="rounded-xl border-border px-3 py-3 focus-visible:ring-primary"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-xl py-3 text-base" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Salvando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Redefinir senha
                      </span>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
