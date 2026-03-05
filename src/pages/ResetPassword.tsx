import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-small.webp";
import { KeyRound, CheckCircle, AlertTriangle } from "lucide-react";
import Layout from "@/components/Layout";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // SECURITY: Validate that we have a valid recovery session
    // This prevents unauthorized access to the password reset form
    const validateRecoverySession = async () => {
      try {
        const hash = window.location.hash;
        
        // Check if URL contains recovery token
        if (!hash || !hash.includes("type=recovery")) {
          setValidSession(false);
          setErrorMessage("Link inválido ou expirado. Solicite um novo link de recuperação.");
          return;
        }

        // Get current session - should be null during password recovery
        const { data: { session } } = await supabase.auth.getSession();
        
        // During password recovery, the session should be null (we blocked it in AuthContext)
        // If there's a session, it means the user is already logged in (security issue)
        if (session?.user) {
          // User is already logged in - log them out first
          await supabase.auth.signOut();
        }

        // Listen for PASSWORD_RECOVERY event to confirm we're in recovery mode
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") {
            setValidSession(true);
            setErrorMessage("");
          }
        });

        // Set a timeout - if we don't get PASSWORD_RECOVERY event, the link is likely invalid
        const timeout = setTimeout(() => {
          if (validSession === null) {
            setValidSession(false);
            setErrorMessage("Sessão de recuperação inválida. Solicite um novo link.");
          }
        }, 2000);

        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
      } catch (error) {
        setValidSession(false);
        setErrorMessage("Erro ao validar sessão de recuperação.");
      }
    };

    validateRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password.length > 128) {
      toast({
        title: "Erro",
        description: "A senha não pode ter mais de 128 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // SECURITY: Update the password using the recovery session
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // Common error: "invalid_grant" means the recovery token has expired
        if (error.message.includes("invalid_grant")) {
          throw new Error("Link de recuperação expirado. Solicite um novo link.");
        }
        throw error;
      }

      // SECURITY: Sign out the user after password reset
      // This forces them to log in with the new password
      await supabase.auth.signOut();

      setSuccess(true);
      toast({
        title: "Senha alterada com sucesso!",
        description: "Faça login com sua nova senha.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    } catch (error: any) {
      const message =
        error.message || "Erro ao redefinir a senha. Tente novamente.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] space-y-6">
          <div className="text-center">
            <img
              src={logo}
              alt="Motorista no Lucro"
              width={50}
              height={50}
              className="mx-auto mb-3 h-[50px] w-auto object-contain"
            />
            <p className="text-sm text-muted-foreground">Redefinir senha</p>
          </div>

          <div className="rounded-3xl bg-card p-8 shadow-lg border border-border">
            {success ? (
              <div className="space-y-4 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-primary" />
                <h1 className="text-2xl font-bold text-card-foreground font-display">
                  Senha redefinida!
                </h1>
                <p className="text-sm text-muted-foreground">
                  Redirecionando para o login...
                </p>
              </div>
            ) : validSession === false ? (
              <div className="space-y-4 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h1 className="text-xl font-bold text-card-foreground font-display">
                  Link inválido ou expirado
                </h1>
                <p className="text-sm text-muted-foreground">
                  {errorMessage ||
                    "O link de recuperação pode ter expirado ou ser inválido."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/forgot-password")}
                  className="rounded-xl"
                >
                  Solicitar novo link
                </Button>
              </div>
            ) : validSession === null ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Validando link de recuperação...
                </p>
              </div>
            ) : (
              <>
                <h1 className="mb-6 text-2xl font-bold text-card-foreground font-display">
                  Defina uma nova senha
                </h1>

                <div className="mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 p-4">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    🔒 <strong>Segurança:</strong> Você será desconectado após
                    redefinir a senha. Faça login novamente com a nova senha.
                  </p>
                </div>

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
                      disabled={isLoading}
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
                      disabled={isLoading}
                      className="rounded-xl border-border px-3 py-3 focus-visible:ring-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full rounded-xl py-3 text-base"
                    disabled={isLoading || !password || !confirmPassword}
                  >
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
