import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Clock, CheckCircle, AlertTriangle, Play, Pause, Square,
  DollarSign, TrendingUp, Timer, BarChart3, FileText, Loader2, Target,
  ArrowUp, ArrowDown, Minus,
} from "lucide-react";
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

function formatTimeFull(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Subscription Banner ────────────────────────────────────────
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
          <p className="text-xs text-muted-foreground">Seus dados estão em modo leitura.</p>
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

// ─── Shift types ────────────────────────────────────────────────
interface ShiftSession {
  id: string;
  start_time: string;
  end_time: string | null;
  total_active_seconds: number;
  meta_acumulada: number;
  paused_at: string | null;
  is_paused: boolean;
}

interface WeeklyRecord {
  lucro_liquido: number | null;
  tempo_ativo_segundos: number | null;
  date: string;
}

// ─── Performance Indicator ──────────────────────────────────────
function PerformanceIndicator({ todayProfit, weekRecords }: { todayProfit: number; weekRecords: WeeklyRecord[] }) {
  const today = new Date().toISOString().split("T")[0];
  const pastRecords = weekRecords.filter(r => r.date !== today && r.lucro_liquido !== null);
  if (pastRecords.length === 0) return null;

  const avgProfit = pastRecords.reduce((s, r) => s + (r.lucro_liquido ?? 0), 0) / pastRecords.length;
  const diff = avgProfit !== 0 ? ((todayProfit - avgProfit) / Math.abs(avgProfit)) * 100 : 0;

  let color = "text-yellow-600";
  let bg = "bg-yellow-100 dark:bg-yellow-900/30";
  let border = "border-yellow-400/30";
  let label = "Dentro da média";
  let Icon = Minus;

  if (diff > 10) {
    color = "text-primary"; bg = "bg-primary/10"; border = "border-primary/20"; label = "Excelente"; Icon = ArrowUp;
  } else if (diff < -10) {
    color = "text-destructive"; bg = "bg-destructive/10"; border = "border-destructive/20"; label = "Abaixo da média"; Icon = ArrowDown;
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl border ${border} px-5 py-3`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${color}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{diff >= 0 ? "+" : ""}{diff.toFixed(1)}% vs média da semana</p>
      </div>
    </div>
  );
}

// ─── Efficiency Card ────────────────────────────────────────────
function EfficiencyCard({ todayProfit, todaySeconds, weekRecords }: { todayProfit: number; todaySeconds: number; weekRecords: WeeklyRecord[] }) {
  const today = new Date().toISOString().split("T")[0];
  const todayHours = todaySeconds / 3600;
  const todayEfficiency = todayHours > 0 ? todayProfit / todayHours : 0;

  const pastRecords = weekRecords.filter(r => r.date !== today && r.lucro_liquido !== null && (r.tempo_ativo_segundos ?? 0) > 0);
  const weekEfficiency = pastRecords.length > 0
    ? pastRecords.reduce((s, r) => s + ((r.lucro_liquido ?? 0) / ((r.tempo_ativo_segundos ?? 1) / 3600)), 0) / pastRecords.length
    : 0;
  const diff = weekEfficiency !== 0 ? ((todayEfficiency - weekEfficiency) / Math.abs(weekEfficiency)) * 100 : 0;

  if (todayHours === 0 && weekEfficiency === 0) return null;

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚡ Eficiência</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Hoje</p>
          <p className="text-base font-bold text-foreground">{fmt(todayEfficiency)}<span className="text-xs font-normal text-muted-foreground">/h</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Média semana</p>
          <p className="text-base font-bold text-foreground">{fmt(weekEfficiency)}<span className="text-xs font-normal text-muted-foreground">/h</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Variação</p>
          <p className={`text-base font-bold ${diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-foreground"}`}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile, isReadOnly } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [shiftLoading, setShiftLoading] = useState(true);
  const [shift, setShift] = useState<ShiftSession | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [metaPorHora, setMetaPorHora] = useState(0);
  const [metaDiaria, setMetaDiaria] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [todayRecord, setTodayRecord] = useState<WeeklyRecord | null>(null);
  const [weekRecords, setWeekRecords] = useState<WeeklyRecord[]>([]);

  const calcActiveSeconds = useCallback((s: ShiftSession): number => {
    let total = s.total_active_seconds;
    if (!s.is_paused && !s.end_time) {
      const startOrResume = new Date(s.start_time);
      const now = new Date();
      const segmentStart = s.paused_at ? new Date(s.paused_at) : startOrResume;
      const elapsed = Math.floor((now.getTime() - segmentStart.getTime()) / 1000);
      total += Math.max(0, elapsed);
    }
    return total;
  }, []);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStart = weekAgo.toISOString().split("T")[0];

    Promise.all([
      supabase.from("shift_sessions").select("*").eq("user_id", user.id).is("end_time", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      supabase.from("daily_records").select("lucro_liquido, tempo_ativo_segundos, date").eq("user_id", user.id).gte("date", weekStart).lte("date", today).order("date", { ascending: true }),
    ]).then(([shiftRes, settingsRes, weekRes]) => {
      if (settingsRes.data) {
        const metaMensal = settingsRes.data.meta_mensal || 0;
        const dias = settingsRes.data.dias_trabalho_mes || 22;
        const md = metaMensal / dias;
        setMetaDiaria(md);
        setMetaPorHora(md / 12);
      }
      if (shiftRes.data) {
        const s = shiftRes.data as ShiftSession;
        setShift(s);
        setActiveSeconds(calcActiveSeconds(s));
      }
      const records = (weekRes.data || []) as WeeklyRecord[];
      setWeekRecords(records);
      const tr = records.find(r => r.date === today);
      if (tr) setTodayRecord(tr);
      setShiftLoading(false);
    });
  }, [user, calcActiveSeconds]);

  useEffect(() => {
    if (shift && !shift.is_paused && !shift.end_time) {
      intervalRef.current = setInterval(() => setActiveSeconds(prev => prev + 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [shift]);

  const metaAcumulada = metaPorHora * (activeSeconds / 3600);
  const faltaParaMeta = Math.max(0, metaDiaria - metaAcumulada);
  const isActive = shift && !shift.end_time;
  const isPaused = shift?.is_paused;

  const handleStart = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.from("shift_sessions").insert({ user_id: user.id, start_time: new Date().toISOString() }).select().single();
      if (error) throw error;
      setShift(data as ShiftSession);
      setActiveSeconds(0);
      toast({ title: "Turno iniciado! 🚗", duration: 2000 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handlePause = async () => {
    if (!shift) return;
    setActionLoading(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const { error } = await supabase.from("shift_sessions").update({ is_paused: true, paused_at: new Date().toISOString(), total_active_seconds: activeSeconds }).eq("id", shift.id);
      if (error) throw error;
      setShift(prev => prev ? { ...prev, is_paused: true, paused_at: new Date().toISOString(), total_active_seconds: activeSeconds } : null);
      toast({ title: "Turno pausado ⏸", duration: 2000 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleResume = async () => {
    if (!shift) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from("shift_sessions").update({ is_paused: false, paused_at: now, total_active_seconds: activeSeconds }).eq("id", shift.id);
      if (error) throw error;
      setShift(prev => prev ? { ...prev, is_paused: false, paused_at: now, total_active_seconds: activeSeconds } : null);
      toast({ title: "Turno retomado! ▶", duration: 2000 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleStop = async () => {
    if (!shift) return;
    setActionLoading(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const finalMeta = metaPorHora * (activeSeconds / 3600);
      const { error } = await supabase.from("shift_sessions").update({ end_time: new Date().toISOString(), total_active_seconds: activeSeconds, meta_acumulada: finalMeta, is_paused: false, paused_at: null }).eq("id", shift.id);
      if (error) throw error;
      toast({ title: "Turno encerrado!", duration: 2000 });
      navigate(`/finalizar-dia?shift=${shift.id}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  if (shiftLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const todayProfit = todayRecord?.lucro_liquido ?? 0;
  const todaySeconds = todayRecord?.tempo_ativo_segundos ?? 0;

  return (
    <Layout>
      <div className="container mx-auto max-w-lg px-4 py-8 space-y-5">
        {/* Greeting */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{getGreeting()}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {profile?.name?.split(" ")[0] || "Motorista"} 👋
          </h1>
        </div>

        <SubscriptionBanner profile={profile} isReadOnly={isReadOnly} />

        {isReadOnly && (
          <Button className="w-full rounded-xl h-12 text-base font-semibold shadow-lg" onClick={() => navigate("/assinar")}>
            Assinar agora
          </Button>
        )}

        {/* ─── TURNO (Cronômetro) ───────────────────────────── */}
        {!isReadOnly && (
          <Card className="rounded-2xl border-border/50 shadow-md overflow-hidden">
            <CardContent className="p-5 space-y-5">
              <div className="text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tempo de Trabalho</p>
                <p className={`text-5xl font-mono font-bold tracking-wider ${isPaused ? "text-muted-foreground" : "text-foreground"}`}>
                  {formatTimeFull(activeSeconds)}
                </p>
                {isPaused && <p className="text-sm text-yellow-600 font-medium animate-pulse mt-1">⏸ Pausado</p>}
              </div>

              <div className="space-y-2">
                {!isActive ? (
                  <Button onClick={handleStart} disabled={actionLoading} className="w-full h-14 text-lg rounded-xl" size="lg">
                    {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                    Iniciar Turno
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button onClick={handlePause} disabled={actionLoading}
                        className="w-full h-14 text-lg rounded-xl border-2 border-amber-500 bg-amber-500 text-white font-semibold hover:bg-amber-600" size="lg">
                        {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                        Pausar
                      </Button>
                    ) : (
                      <Button onClick={handleResume} disabled={actionLoading}
                        className="w-full h-14 text-lg rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white font-semibold hover:bg-emerald-700" size="lg">
                        {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                        Retomar
                      </Button>
                    )}
                    <Button onClick={handleStop} disabled={actionLoading} variant="destructive" className="w-full h-14 text-lg rounded-xl" size="lg">
                      {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Square className="h-5 w-5 mr-2" />}
                      Encerrar Turno
                    </Button>
                  </>
                )}
              </div>

              {isActive && (
                <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => navigate("/finalizar-dia" + (shift ? `?shift=${shift.id}` : ""))}>
                  Registrar Dia
                </Button>
              )}

              {metaPorHora === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Configure suas metas em{" "}
                  <button onClick={() => navigate("/configuracoes")} className="underline text-primary">Configurações</button>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── META ACUMULADA ────────────────────────────────── */}
        {!isReadOnly && metaPorHora > 0 && (
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Meta Acumulada
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Acumulado</p>
                  <p className="text-lg font-bold text-primary">{fmt(metaAcumulada)}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta do dia</p>
                  <p className="text-lg font-bold text-foreground">{fmt(metaDiaria)}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Falta</p>
                  <p className="text-lg font-bold text-destructive">{fmt(faltaParaMeta)}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta/hora</p>
                  <p className="text-lg font-bold text-foreground">{fmt(metaPorHora)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Performance Indicator ─────────────────────────── */}
        {todayRecord && <PerformanceIndicator todayProfit={todayProfit} weekRecords={weekRecords} />}

        {/* ─── Efficiency ────────────────────────────────────── */}
        {todayRecord && <EfficiencyCard todayProfit={todayProfit} todaySeconds={todaySeconds} weekRecords={weekRecords} />}

        {/* Quick actions */}
        {!isReadOnly && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-xl h-14 flex flex-col items-center gap-1 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors" onClick={() => navigate("/finalizar-dia")}>
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Finalizar Dia</span>
            </Button>
            <Button variant="outline" className="rounded-xl h-14 flex flex-col items-center gap-1 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors" onClick={() => navigate("/relatorios")}>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium">Relatórios</span>
            </Button>
          </div>
        )}

        {isReadOnly && (
          <Button variant="outline" className="w-full rounded-xl h-14 flex items-center gap-2" onClick={() => navigate("/relatorios")}>
            <BarChart3 className="h-4 w-4" /> Ver Relatórios
          </Button>
        )}
      </div>
    </Layout>
  );
}
