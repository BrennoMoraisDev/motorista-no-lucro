import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wrench, AlertTriangle, CheckCircle, Trash2, Plus, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";

interface MaintenanceRecord {
  id: string;
  type: string;
  description: string;
  km_atual: number;
  data_realizacao: string;
  custo: number | null;
  proxima_manutencao_km: number | null;
}

const MAINTENANCE_TYPES = [
  { id: "oleo", label: "Troca de Óleo", interval_km: 10000 },
  { id: "filtro_ar", label: "Filtro de Ar", interval_km: 15000 },
  { id: "filtro_combustivel", label: "Filtro de Combustível", interval_km: 20000 },
  { id: "pneus", label: "Revisão de Pneus", interval_km: 10000 },
  { id: "freios", label: "Revisão de Freios", interval_km: 30000 },
  { id: "correia_distribuicao", label: "Correia de Distribuição", interval_km: 80000 },
  { id: "bateria", label: "Bateria", interval_km: 50000 },
  { id: "outro", label: "Outra Manutenção", interval_km: 0 },
];

export default function Manutencao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [totalKm, setTotalKm] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "oleo",
    description: "",
    km_atual: "",
    custo: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [maintenanceRes, dailyRes] = await Promise.all([
        supabase
          .from("maintenance_records")
          .select("*")
          .eq("user_id", user.id)
          .order("data_realizacao", { ascending: false }),
        supabase
          .from("daily_records")
          .select("km_total")
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
      ]);

      if (maintenanceRes.data) {
        setRecords(maintenanceRes.data);
      }

      if (dailyRes.data && dailyRes.data.length > 0) {
        const totalKmAccumulated = dailyRes.data.reduce(
          (sum, r) => sum + (r.km_total || 0),
          0
        );
        setTotalKm(totalKmAccumulated);
      }
    } catch (err) {
      console.error("Erro ao carregar manutenções:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.km_atual) return;

    setSaving(true);
    try {
      const maintenanceType = MAINTENANCE_TYPES.find(
        (t) => t.id === formData.type
      );
      const proxima_km =
        maintenanceType && maintenanceType.interval_km > 0
          ? parseInt(formData.km_atual) + maintenanceType.interval_km
          : null;

      const { error } = await supabase.from("maintenance_records").insert({
        user_id: user.id,
        type: formData.type,
        description: formData.description,
        km_atual: parseInt(formData.km_atual),
        data_realizacao: new Date().toISOString().split("T")[0],
        custo: formData.custo ? parseFloat(formData.custo) : null,
        proxima_manutencao_km: proxima_km,
      });

      if (error) throw error;
      toast({
        title: "Manutenção registrada!",
        description: "Registro adicionado com sucesso.",
      });
      setFormData({ type: "oleo", description: "", km_atual: "", custo: "" });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("maintenance_records")
        .delete()
        .eq("id", deleteId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Registro deletado!" });
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getMaintenanceLabel = (typeId: string) => {
    return MAINTENANCE_TYPES.find((t) => t.id === typeId)?.label || typeId;
  };

  const getNextMaintenanceAlerts = () => {
    const alerts: Array<{ type: string; daysUntil: number; kmUntil: number }> =
      [];

    MAINTENANCE_TYPES.forEach((mType) => {
      if (mType.interval_km === 0) return;

      const lastRecord = records.find((r) => r.type === mType.id);
      const baseKm = lastRecord?.km_atual || 0;
      const nextKm = baseKm + mType.interval_km;
      const kmUntil = nextKm - totalKm;

      if (kmUntil <= 5000 && kmUntil > 0) {
        alerts.push({ type: mType.id, daysUntil: 0, kmUntil });
      }
    });

    return alerts.sort((a, b) => a.kmUntil - b.kmUntil);
  };

  const alerts = getNextMaintenanceAlerts();

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wrench className="h-6 w-6" /> Manutenção do Veículo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total de km acumulados: <strong>{totalKm.toLocaleString("pt-BR")}</strong>
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl gap-2"
          >
            <Plus className="h-4 w-4" />
            Registrar Manutenção
          </Button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Card
                key={alert.type}
                className="rounded-2xl border-yellow-400/30 bg-yellow-50 dark:bg-yellow-900/10"
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {getMaintenanceLabel(alert.type)} próxima
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Faltam {alert.kmUntil.toLocaleString("pt-BR")} km
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <Card className="rounded-2xl border-border shadow-lg">
            <CardHeader>
              <CardTitle>Registrar Manutenção</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMaintenance} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Manutenção</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="km">KM Atual</Label>
                  <Input
                    id="km"
                    type="number"
                    value={formData.km_atual}
                    onChange={(e) =>
                      setFormData({ ...formData, km_atual: e.target.value })
                    }
                    placeholder="Ex: 50000"
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Ex: Troca de óleo sintético 5W30"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custo">Custo (R$, opcional)</Label>
                  <Input
                    id="custo"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.custo}
                    onChange={(e) =>
                      setFormData({ ...formData, custo: e.target.value })
                    }
                    placeholder="Ex: 150.00"
                    className="rounded-xl"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Records */}
        <div className="space-y-3">
          {records.length === 0 ? (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-8 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  Nenhum registro de manutenção ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            records.map((record) => {
              const maintenanceType = MAINTENANCE_TYPES.find(
                (t) => t.id === record.type
              );
              const isUpcoming =
                record.proxima_manutencao_km &&
                totalKm >= record.proxima_manutencao_km - 5000;

              return (
                <Card
                  key={record.id}
                  className={`rounded-2xl border-border/50 ${
                    isUpcoming
                      ? "border-yellow-400/30 bg-yellow-50 dark:bg-yellow-900/10"
                      : ""
                  }`}
                >
                  <CardContent className="p-4 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">
                          {getMaintenanceLabel(record.type)}
                        </p>
                        {isUpcoming && (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>
                      {record.description && (
                        <p className="text-sm text-muted-foreground">
                          {record.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          📅{" "}
                          {new Date(record.data_realizacao).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                        <span>🛣️ {record.km_atual.toLocaleString("pt-BR")} km</span>
                        {record.custo && (
                          <span>
                            💰 R${record.custo.toLocaleString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {record.proxima_manutencao_km && (
                        <p className="text-xs text-primary font-medium mt-2">
                          Próxima em {record.proxima_manutencao_km.toLocaleString("pt-BR")} km
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(record.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar registro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deletando..." : "Deletar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
