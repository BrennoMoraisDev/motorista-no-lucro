import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Clock, CheckCircle, AlertTriangle, Play, DollarSign, TrendingUp, Timer, BarChart3, FileText, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function SubscriptionBanner({ profile, isReadOnly }: { profile: any; isReadOnly: boolean }) {
  if (!profile) return null;
  const isAdmin = profile.email === "brennomoraisdev@gmail.com";
  if (isAdmin) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Star className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">Admin – Acesso vitalício</p>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Assinatura expirada</p>
          <p className="text-xs text-muted-foreground">Seus dados estão em modo leitura. Assine para continuar registrando.</p>
        </div>
      </div>
    );
  }

  const status = profile.status_assinatura;
  const expDate = profile.data_expiracao ? new Date(profile.data_expiracao) : null;
  const now = new Date();
  if (status === "trial" && expDate && expDate > now) {
    const daysLeft = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-50 dark:bg-yellow-900/10 px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <Clock className="h-4 w-4 text-yellow-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Teste grátis</p>
          <p className="text-xs text-muted-foreground">{daysLeft} dia{daysLeft !== 1 ? "s" : ""} restante{daysLeft !== 1 ? "s" : ""}</p>
        </div>
      </div>
    );
  }
  if (status === "active" && expDate && expDate > now) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">Premium ativo</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
      </div>
      <p className="text-sm font-semibold text-foreground">Assinatura expirada</p>
    </div>
  );
}

interface TodaySummary {
  total_faturamento: number | null;
  lucro_liquido: number | null;
  tempo_ativo_segundos: number | null;
  uber_rides: number | null;
  ninety_nine_rides: number | null;
  indrive_rides: number | null;
  private_rides: number | null;
}

function StatItem({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
        {icon}
      </div>
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold ${accent || "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, isReadOnly } = useAuth();
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState<{ id: string } | null>(null);
  const [todayRecord, setTodayRecord] = useState<TodaySummary | null>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase
        .from("shift_sessions")
        .select("id")
        .eq("user_id", user.id)
        .is("end_time", null)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_records")
        .select("total_faturamento, lucro_liquido, tempo_ativo_segundos, uber_rides, ninety_nine_rides, indrive_rides, private_rides")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle(),
    ]).then(([shiftRes, recordRes]) => {
      if (shiftRes.data) setActiveShift(shiftRes.data);
      if (recordRes.data) setTodayRecord(recordRes.data as TodaySummary);
    });
  }, [user]);

  const totalCorridas = todayRecord
    ? (todayRecord.uber_rides ?? 0) + (todayRecord.ninety_nine_rides ?? 0) + (todayRecord.indrive_rides ?? 0) + (todayRecord.private_rides ?? 0)
    : 0;

  return (
    <Layout>
      <div className="container mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Greeting section */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{getGreeting()}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {profile?.name?.split(" ")[0] || "Motorista"} 👋
          </h1>
        </div>

        {/* Subscription status */}
        <SubscriptionBanner profile={profile} isReadOnly={isReadOnly} />

        {/* CTA to subscribe when read-only */}
        {isReadOnly && (
          <Button className="w-full rounded-xl h-12 text-base font-semibold shadow-lg" onClick={() => navigate("/assinar")}>
            Assinar agora
          </Button>
        )}

        {/* Shift CTA - hidden when read-only */}
        {!isReadOnly && (
          <Card
            className="group rounded-2xl border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(142, 72%, 48%))",
            }}
            onClick={() => navigate("/turno")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-white group-hover:scale-105 transition-transform">
                <Play className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-white">
                  {activeShift ? "Continuar Turno" : "Iniciar Turno"}
                </p>
                <p className="text-sm text-white/70">
                  {activeShift ? "Você tem um turno ativo" : "Comece a cronometrar seu dia"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/50 group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        )}

        {/* Today summary */}
        {todayRecord && (
          <Card className="rounded-2xl border-0 shadow-md overflow-hidden">
            <CardContent className="p-0">
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo de hoje</p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                <StatItem
                  icon={<DollarSign className="h-4 w-4 text-primary" />}
                  label="Faturamento"
                  value={fmt(todayRecord.total_faturamento ?? 0)}
                />
                <StatItem
                  icon={<TrendingUp className="h-4 w-4 text-primary" />}
                  label="Lucro"
                  value={fmt(todayRecord.lucro_liquido ?? 0)}
                  accent={(todayRecord.lucro_liquido ?? 0) >= 0 ? "text-primary" : "text-destructive"}
                />
                <StatItem
                  icon={<Timer className="h-4 w-4 text-muted-foreground" />}
                  label="Tempo"
                  value={formatTime(todayRecord.tempo_ativo_segundos ?? 0)}
                />
              </div>
              {totalCorridas > 0 && (
                <div className="border-t border-border px-5 py-2.5">
                  <p className="text-xs text-center text-muted-foreground font-medium">{totalCorridas} corrida{totalCorridas !== 1 ? "s" : ""} realizadas hoje</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick actions - hidden when read-only */}
        {!isReadOnly && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="rounded-xl h-14 flex flex-col items-center gap-1 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors"
              onClick={() => navigate("/finalizar-dia")}
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Finalizar Dia</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-14 flex flex-col items-center gap-1 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors"
              onClick={() => navigate("/relatorios")}
            >
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Relatórios</span>
            </Button>
          </div>
        )}

        {/* Read-only: only show reports link */}
        {isReadOnly && (
          <Button variant="outline" className="w-full rounded-xl h-14 flex items-center gap-2" onClick={() => navigate("/relatorios")}>
            <BarChart3 className="h-4 w-4" />
            Ver Relatórios
          </Button>
        )}
      </div>
    </Layout>
  );
}
