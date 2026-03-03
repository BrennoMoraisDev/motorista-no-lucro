import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo-small.webp";
import { Mail, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada." });
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
            <p className="text-sm text-muted-foreground">Recuperação de senha</p>
          </div>

          <div className="rounded-3xl bg-card p-8 shadow-lg border border-border">
            <h1 className="mb-6 text-2xl font-bold text-card-foreground font-display">
              Esqueci minha senha
            </h1>

            {sent ? (
              <div className="space-y-4 text-center">
                <Mail className="mx-auto h-12 w-12 text-primary" />
                <p className="text-foreground">
                  Enviamos um link de recuperação para <strong>{email}</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Verifique sua caixa de entrada e spam. O link expira em 1 hora.
                </p>
                <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-xl border-border px-3 py-3 focus-visible:ring-primary"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl py-3 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Enviando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Enviar link de recuperação
                    </span>
                  )}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="font-semibold text-primary hover:underline">
                    Voltar ao login
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
