import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Target, Car, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Metas state
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [metaMensal, setMetaMensal] = useState("");
  const [diasTrabalho, setDiasTrabalho] = useState("");
  const [savingMetas, setSavingMetas] = useState(false);

  // Vehicle state
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [valorFipe, setValorFipe] = useState("");
  const [ipvaVencimento, setIpvaVencimento] = useState("");
  const [manutencao, setManutencao] = useState("");
  const [seguro, setSeguro] = useState("");
  const [financiamento, setFinanciamento] = useState("");
  const [incluirIpva, setIncluirIpva] = useState(true);
  const [incluirManutencao, setIncluirManutencao] = useState(true);
  const [incluirSeguro, setIncluirSeguro] = useState(true);
  const [incluirFinanciamento, setIncluirFinanciamento] = useState(true);
  const [savingVeiculo, setSavingVeiculo] = useState(false);

  // Combustível state
  const [ultimoAbastecimento, setUltimoAbastecimento] = useState({ km: 0, litros: 0 });
  const [consumoMedio, setConsumoMedio] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [settingsRes, vehicleRes] = await Promise.all([
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
        supabase.from("vehicles").select("*").eq("user_id", user.id).single(),
      ]);
      if (settingsRes.data) {
        setSettingsId(settingsRes.data.id);
        setMetaMensal(String(settingsRes.data.meta_mensal || ""));
        setDiasTrabalho(String(settingsRes.data.dias_trabalho_mes || ""));
      }
      if (vehicleRes.data) {
        const v = vehicleRes.data;
        setVehicleId(v.id);
        setValorFipe(String(v.valor_fipe || ""));
        setIpvaVencimento(v.ipva_vencimento || "");
        setManutencao(String(v.manutencao_mensal_est ?? ""));
        setSeguro(String(v.seguro_mensal_est ?? ""));
        setFinanciamento(String(v.financiamento_mensal ?? ""));
        setIncluirIpva(v.incluir_ipva);
        setIncluirManutencao(v.incluir_manutencao);
        setIncluirSeguro(v.incluir_seguro);
        setIncluirFinanciamento(v.incluir_financiamento);
        if (v.ultimo_abastecimento_km && v.ultimo_abastecimento_litros) {
          setUltimoAbastecimento({
            km: v.ultimo_abastecimento_km,
            litros: v.ultimo_abastecimento_litros,
          });
        }
        if (v.consumo_medio) {
          setConsumoMedio(v.consumo_medio);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  // Derived calculations
  const metaDiaria = metaMensal && diasTrabalho
    ? (parseFloat(metaMensal) / (parseInt(diasTrabalho) || 1))
    : 0;

  const fipeNum = parseFloat(valorFipe) || 0;
  const ipvaEstimado = fipeNum * 0.04;
  const provisaoIpvaMensal = ipvaEstimado / 12;
  const manutencaoNum = parseFloat(manutencao) || 0;
  const seguroNum = parseFloat(seguro) || 0;
  const financiamentoNum = parseFloat(financiamento) || 0;

  const custoFixoMensal =
    (incluirIpva ? provisaoIpvaMensal : 0) +
    (incluirManutencao ? manutencaoNum : 0) +
    (incluirSeguro ? seguroNum : 0) +
    (incluirFinanciamento ? financiamentoNum : 0);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSaveMetas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingMetas(true);
    try {
      const payload = {
        user_id: user.id,
        meta_mensal: parseFloat(metaMensal) || 0,
        dias_trabalho_mes: parseInt(diasTrabalho) || 22,
      };
      if (settingsId) {
        const { error } = await supabase.from("user_settings").update(payload).eq("id", settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("user_settings").insert(payload).select().single();
        if (error) throw error;
        if (data) setSettingsId(data.id);
      }
      toast({ title: "Metas salvas!", description: "Suas metas foram atualizadas." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingMetas(false);
    }
  };

  const handleSaveVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingVeiculo(true);
    try {
      const payload = {
        user_id: user.id,
        valor_fipe: fipeNum,
        ipva_vencimento: ipvaVencimento || null,
        manutencao_mensal_est: manutencao ? manutencaoNum : null,
        seguro_mensal_est: seguro ? seguroNum : null,
        financiamento_mensal: financiamento ? financiamentoNum : null,
        incluir_ipva: incluirIpva,
        incluir_manutencao: incluirManutencao,
        incluir_seguro: incluirSeguro,
        incluir_financiamento: incluirFinanciamento,
      };
      if (vehicleId) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", vehicleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("vehicles").insert(payload).select().single();
        if (error) throw error;
        if (data) setVehicleId(data.id);
      }
      toast({ title: "Veículo salvo!", description: "Os dados foram atualizados." });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingVeiculo(false);
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

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-10 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Planejamento Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Defina suas metas, custos e dados do veículo</p>
        </div>

        <Tabs defaultValue="metas" className="w-full">
          <TabsList className="mb-6 w-full grid grid-cols-2">
            <TabsTrigger value="metas" className="gap-2"><Target className="h-4 w-4" />Metas</TabsTrigger>
            <TabsTrigger value="veiculo" className="gap-2"><Car className="h-4 w-4" />Veículo</TabsTrigger>
            <TabsTrigger value="combustivel" className="gap-2">⛽ Combustível</TabsTrigger>
          </TabsList>

          {/* METAS TAB */}
          <TabsContent value="metas">
            <Card className="rounded-2xl border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Metas Mensais</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveMetas} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="metaMensal">Meta mensal (R$)</Label>
                    <Input id="metaMensal" type="number" min="0" step="0.01" value={metaMensal} onChange={(e) => setMetaMensal(e.target.value)} placeholder="Ex: 6000" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diasTrabalho">Dias trabalhados por mês</Label>
                    <Input id="diasTrabalho" type="number" min="1" max="31" value={diasTrabalho} onChange={(e) => setDiasTrabalho(e.target.value)} placeholder="Ex: 22" className="rounded-xl" />
                  </div>

                  <div className="rounded-xl bg-muted p-4 text-center">
                    <p className="text-sm text-muted-foreground">Meta diária estimada</p>
                    <p className="text-2xl font-bold text-primary">{fmt(metaDiaria)}</p>
                  </div>

                  <Button type="submit" className="w-full rounded-xl" disabled={savingMetas}>
                    {savingMetas ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Save className="h-4 w-4" />Salvar metas</span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VEÍCULO TAB */}
          <TabsContent value="veiculo">
            <Card className="rounded-2xl border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Meu Veículo</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveVeiculo} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="valorFipe">Valor FIPE (R$)</Label>
                    <Input id="valorFipe" type="number" min="0" step="0.01" value={valorFipe} onChange={(e) => setValorFipe(e.target.value)} placeholder="Ex: 45000" className="rounded-xl" />
                  </div>

                  {fipeNum > 0 && (
                    <div className="rounded-xl bg-muted p-4 space-y-1">
                      <p className="text-sm text-muted-foreground">IPVA estimado (4%): <span className="font-semibold text-foreground">{fmt(ipvaEstimado)}/ano</span></p>
                      <p className="text-sm text-muted-foreground">Provisão mensal IPVA: <span className="font-semibold text-foreground">{fmt(provisaoIpvaMensal)}/mês</span></p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="ipvaVencimento">Vencimento do IPVA</Label>
                    <Input id="ipvaVencimento" type="date" value={ipvaVencimento} onChange={(e) => setIpvaVencimento(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manutencao">Manutenção mensal estimada (R$)</Label>
                    <Input id="manutencao" type="number" min="0" step="0.01" value={manutencao} onChange={(e) => setManutencao(e.target.value)} placeholder="Ex: 300" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seguro">Seguro mensal estimado (R$)</Label>
                    <Input id="seguro" type="number" min="0" step="0.01" value={seguro} onChange={(e) => setSeguro(e.target.value)} placeholder="Ex: 200" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="financiamento">Financiamento/Aluguel mensal (R$)</Label>
                    <Input id="financiamento" type="number" min="0" step="0.01" value={financiamento} onChange={(e) => setFinanciamento(e.target.value)} placeholder="Ex: 1200" className="rounded-xl" />
                  </div>

                  <div className="space-y-3 rounded-xl bg-muted p-4">
                    <p className="text-sm font-medium text-foreground">Incluir no cálculo do lucro:</p>
                    <div className="flex items-center justify-between"><Label className="text-sm">IPVA</Label><Switch checked={incluirIpva} onCheckedChange={setIncluirIpva} /></div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Manutenção</Label><Switch checked={incluirManutencao} onCheckedChange={setIncluirManutencao} /></div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Seguro</Label><Switch checked={incluirSeguro} onCheckedChange={setIncluirSeguro} /></div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Financiamento</Label><Switch checked={incluirFinanciamento} onCheckedChange={setIncluirFinanciamento} /></div>
                  </div>

                  {custoFixoMensal > 0 && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                      <p className="text-sm text-muted-foreground">Custo fixo mensal total</p>
                      <p className="text-2xl font-bold text-destructive">{fmt(custoFixoMensal)}</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full rounded-xl" disabled={savingVeiculo}>
                    {savingVeiculo ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Save className="h-4 w-4" />Salvar veículo</span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* COMBUSTÍVEL TAB */}
          <TabsContent value="combustivel">
            <Card className="rounded-2xl border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Eficiência de Combustível</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="rounded-xl bg-muted p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Último Abastecimento Registrado</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">KM</p>
                        <p className="text-lg font-bold text-primary">{ultimoAbastecimento.km.toLocaleString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Litros</p>
                        <p className="text-lg font-bold text-primary">{ultimoAbastecimento.litros.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {consumoMedio > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                      <p className="text-sm text-muted-foreground">Consumo Médio</p>
                      <p className="text-3xl font-bold text-primary">{consumoMedio.toFixed(2)} km/l</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Custo por km: R$ {((ultimoAbastecimento.litros > 0 ? 1 / consumoMedio : 0) * 5).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      💡 O consumo é calculado automaticamente quando você registra um novo abastecimento no Dashboard durante o "Finalizar Dia".
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
