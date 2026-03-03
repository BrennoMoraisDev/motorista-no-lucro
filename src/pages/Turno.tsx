import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Square, Timer, Loader2, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";

interface ShiftSession {
  id: string;
  start_time: string;
  end_time: string | null;
  total_active_seconds: number;
  meta_acumulada: number;
  paused_at: string | null;
  is_paused: boolean;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Turno() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<ShiftSession | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [metaPorHora, setMetaPorHora] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate current active seconds from shift data
  const calcActiveSeconds = useCallback((s: ShiftSession): number => {
    let total = s.total_active_seconds;
    if (!s.is_paused && !s.end_time) {
      // Add time since last resume/start
      const ref = s.paused_at ? new Date(s.paused_at) : new Date(s.start_time);
      // If not paused, time since start minus already accumulated paused time
      // total_active_seconds already has accumulated time from previous segments
      // We need to add the current running segment
      const now = new Date();
      const startOrResume = new Date(s.start_time);
      // Current segment = now - (start_time + total_active_seconds worth of time ago)
      // Simpler: total_active_seconds is accumulated from pauses. Current running = now - last_resume_point
      // But we don't store last_resume_point. We know:
      // total_active_seconds = sum of all completed segments
      // current running segment started at: start_time + total_active_seconds + total_paused_time
      // Easier approach: elapsed since start minus total paused time = active time
      // But we don't track total paused time either.
      // Best approach: total_active_seconds is updated on pause/stop.
      // When running, live_active = total_active_seconds + (now - last_action_time)
      // last_action_time = start_time if never paused, or the time of last resume
      // We don't have last_resume explicitly, but:
      // After resume: total_active_seconds was updated, is_paused=false, paused_at=null
      // So the "current segment start" is calculable as:
      // start_time + total_active_seconds (in a simplified model where we track segments)
      // Actually the simplest: store a "segment_start" or compute from DB timestamps.
      // For now: we'll compute elapsed = total_active_seconds + seconds since (start adjusted)
      // Let's use: on start, total=0, running from start_time
      // on pause, total += (now - segment_start), we set paused_at
      // on resume, segment restarts, total stays
      // So when running: live = total_active_seconds + (now - segment_start)
      // segment_start for first run = start_time
      // segment_start after resume = we need to know when resume happened
      // We don't store resume time. Let's approximate:
      // If paused_at is null and is_paused is false:
      //   If total_active_seconds == 0 → segment started at start_time
      //   If total_active_seconds > 0 → a resume happened. 
      //     The resume time ≈ we can compute it from updated_at if we had it.
      // 
      // SOLUTION: We'll update total_active_seconds on pause, and on resume we'll 
      // store the resume timestamp in paused_at (repurposing it as "last segment start").
      // Actually let's keep it simple: use created_at or add a field.
      //
      // PRAGMATIC APPROACH: Use paused_at as "last segment start" when resuming.
      // On start: segment starts at start_time
      // On pause: total_active_seconds += (now - segment_start), paused_at = now, is_paused = true
      // On resume: is_paused = false, paused_at = now (as marker of when segment started)
      // On stop: if running, total += (now - segment_start)
      //
      // Wait, that changes paused_at semantics. Let's just track in frontend.
      // 
      // SIMPLEST: The backend updates total_active_seconds on pause/stop.
      // When running (not paused), the frontend adds elapsed since the shift was last 
      // "activated". We don't know exactly when, but we can estimate:
      // If the shift was just started (total=0), segment began at start_time.
      // If resumed, we don't know the resume time from current schema.
      //
      // FIX: Let's repurpose paused_at. On resume, set paused_at = null.
      // We need another way. Let's just add the running delta on the frontend.
      // We'll track a "segmentStartedAt" in state that we set when we start/resume.
      
      // For page reload recovery, we need a reference time.
      // Let's use a simple heuristic: the shift has been running for
      // (now - start_time) total real seconds. Subtract total_active_seconds 
      // to get total paused time. Then active = now - start_time - paused_time = 
      // now - start_time - ((now - start_time) - total_active_seconds) ... circular.
      // 
      // We need to store segment_start. Let's add it to our logic:
      // We'll save "last_segment_start" in paused_at when resuming (paused_at = now, is_paused=false).
      // Unconventional but works. When is_paused=false and paused_at is set, it means 
      // "current segment started at paused_at". When is_paused=true and paused_at is set,
      // it means "paused since paused_at".
      
      // For recovery: if not paused, segment_start = paused_at (if set, from resume) or start_time (first segment)
      const segmentStart = s.paused_at ? new Date(s.paused_at) : startOrResume;
      const elapsed = Math.floor((now.getTime() - segmentStart.getTime()) / 1000);
      total += Math.max(0, elapsed);
    }
    return total;
  }, []);

  // Load current shift and meta
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [shiftRes, settingsRes] = await Promise.all([
        supabase
          .from("shift_sessions")
          .select("*")
          .eq("user_id", user.id)
          .is("end_time", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      ]);

      if (settingsRes.data) {
        const metaMensal = settingsRes.data.meta_mensal || 0;
        const dias = settingsRes.data.dias_trabalho_mes || 22;
        const metaDiaria = metaMensal / dias;
        setMetaPorHora(metaDiaria / 12);
      }

      if (shiftRes.data) {
        const s = shiftRes.data as ShiftSession;
        setShift(s);
        setActiveSeconds(calcActiveSeconds(s));
      }
      setLoading(false);
    })();
  }, [user, calcActiveSeconds]);

  // Timer interval
  useEffect(() => {
    if (shift && !shift.is_paused && !shift.end_time) {
      intervalRef.current = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shift]);

  const metaAcumulada = metaPorHora * (activeSeconds / 3600);

  const handleStart = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from("shift_sessions")
        .insert({ user_id: user.id, start_time: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      const s = data as ShiftSession;
      setShift(s);
      setActiveSeconds(0);
      toast({ title: "Turno iniciado! 🚗", duration: 2000 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!shift) return;
    setActionLoading(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const { error } = await supabase
        .from("shift_sessions")
        .update({
          is_paused: true,
          paused_at: new Date().toISOString(),
          total_active_seconds: activeSeconds,
        })
        .eq("id", shift.id);
      if (error) throw error;
      setShift((prev) => prev ? { ...prev, is_paused: true, paused_at: new Date().toISOString(), total_active_seconds: activeSeconds } : null);
      toast({ title: "Turno pausado ⏸", duration: 2000 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!shift) return;
    setActionLoading(true);
    try {
      // Store "now" in paused_at as segment start marker, is_paused = false
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("shift_sessions")
        .update({
          is_paused: false,
          paused_at: now, // repurposed as "current segment started at"
          total_active_seconds: activeSeconds,
        })
        .eq("id", shift.id);
      if (error) throw error;
      setShift((prev) => prev ? { ...prev, is_paused: false, paused_at: now, total_active_seconds: activeSeconds } : null);
      toast({ title: "Turno retomado! ▶", duration: 2000 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    if (!shift) return;
    setActionLoading(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const finalMeta = metaPorHora * (activeSeconds / 3600);
      const { error } = await supabase
        .from("shift_sessions")
        .update({
          end_time: new Date().toISOString(),
          total_active_seconds: activeSeconds,
          meta_acumulada: finalMeta,
          is_paused: false,
          paused_at: null,
        })
        .eq("id", shift.id);
      if (error) throw error;
      toast({ title: "Turno encerrado!", duration: 2000 });
      navigate(`/finalizar-dia?shift=${shift.id}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const isActive = shift && !shift.end_time;
  const isPaused = shift?.is_paused;

  return (
    <Layout>
      <div className="container mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-foreground text-center">Modo Turno</h1>

        <Card className="rounded-2xl border-border shadow-lg overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Timer display */}
            <div className="text-center space-y-2">
              <Timer className="h-10 w-10 mx-auto text-primary" />
              <p className={`text-6xl font-mono font-bold tracking-wider ${isPaused ? "text-muted-foreground" : "text-foreground"}`}>
                {formatTime(activeSeconds)}
              </p>
              {isPaused && (
                <p className="text-sm text-yellow-600 font-medium animate-pulse">⏸ Pausado</p>
              )}
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Meta/hora</p>
                <p className="text-lg font-bold text-primary">{fmt(metaPorHora)}</p>
              </div>
              <div className="rounded-xl bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Meta acumulada</p>
                <p className="text-lg font-bold text-secondary flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {fmt(metaAcumulada)}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              {!isActive ? (
                <Button
                  onClick={handleStart}
                  disabled={actionLoading}
                  className="w-full h-14 text-lg rounded-xl"
                  size="lg"
                >
                  {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                  Iniciar Turno
                </Button>
              ) : (
                <>
                  {!isPaused ? (
                    <Button
                      onClick={handlePause}
                      disabled={actionLoading}
                      className="w-full h-14 text-lg rounded-xl border-2 border-amber-500 bg-amber-500 text-white font-semibold hover:bg-amber-600 hover:border-amber-600 focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 transition-colors"
                      size="lg"
                    >
                      {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                      Pausar
                    </Button>
                  ) : (
                    <Button
                      onClick={handleResume}
                      disabled={actionLoading}
                      className="w-full h-14 text-lg rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white font-semibold hover:bg-emerald-700 hover:border-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition-colors"
                      size="lg"
                    >
                      {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                      Retomar
                    </Button>
                  )}
                  <Button
                    onClick={handleStop}
                    disabled={actionLoading}
                    variant="destructive"
                    className="w-full h-14 text-lg rounded-xl"
                    size="lg"
                  >
                    {actionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Square className="h-5 w-5 mr-2" />}
                    Encerrar Turno
                  </Button>
                </>
              )}
            </div>

            {isActive && (
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={() => navigate("/finalizar-dia" + (shift ? `?shift=${shift.id}` : ""))}
              >
                Registrar Dia
              </Button>
            )}

            {metaPorHora === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Configure suas metas em{" "}
                <button onClick={() => navigate("/configuracoes")} className="underline text-primary">
                  Configurações
                </button>{" "}
                para ver a meta acumulada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
