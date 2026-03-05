import { useEffect, useState, useCallback } from "react";
import { useAdminApi } from "@/hooks/useAdminApi";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RefreshCw, ChevronLeft, ChevronRight, Eye } from "lucide-react";

interface KiwifyEvent {
  id: string;
  event_id: string;
  event_type: string;
  email: string | null;
  processed: boolean;
  processed_at: string | null;
  error_log: string | null;
  created_at: string;
  payload: Record<string, unknown>;
}

export default function AdminEvents() {
  const api = useAdminApi();
  const [events, setEvents] = useState<KiwifyEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [retryTarget, setRetryTarget] = useState<KiwifyEvent | null>(null);
  const [viewPayload, setViewPayload] = useState<KiwifyEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const processed = filter === "all" ? undefined : filter;
      const res = await api.kiwifyEvents(processed, page);
      setEvents(res.events || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async () => {
    if (!retryTarget) return;
    try {
      await api.retryEvent(retryTarget.id);
      toast.success("Evento reprocessado com sucesso!");
      setRetryTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Processados</SelectItem>
            <SelectItem value="false">Não processados</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum evento registrado</TableCell></TableRow>
            ) : (
              events.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(ev.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell><Badge variant="outline">{ev.event_type}</Badge></TableCell>
                  <TableCell className="text-sm">{ev.email || "—"}</TableCell>
                  <TableCell>
                    {ev.processed
                      ? <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">OK</Badge>
                      : <Badge variant="destructive">Pendente</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-[200px] truncate">{ev.error_log || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewPayload(ev)} title="Ver payload">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRetryTarget(ev)} title="Reprocessar">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} evento(s)</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={events.length < 50} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Retry dialog */}
      <Dialog open={!!retryTarget} onOpenChange={() => setRetryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprocessar Evento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reprocessar o evento "{retryTarget?.event_type}" 
              {retryTarget?.email ? ` (${retryTarget.email})` : ""}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetryTarget(null)}>Cancelar</Button>
            <Button onClick={handleRetry}>Reprocessar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payload viewer dialog */}
      <Dialog open={!!viewPayload} onOpenChange={() => setViewPayload(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payload do Evento</DialogTitle>
            <DialogDescription>
              {viewPayload?.event_type} — {viewPayload?.email || "sem email"} — {viewPayload?.created_at ? new Date(viewPayload.created_at).toLocaleString("pt-BR") : ""}
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
            {viewPayload ? JSON.stringify(viewPayload.payload, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
