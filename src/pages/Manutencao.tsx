import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Manutencao() {
  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wrench className="h-6 w-6" /> Manutenção do Veículo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de manutenções preventivas</p>
        </div>

        <Alert className="bg-muted border-border">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Funcionalidade em desenvolvimento. Em breve você poderá registrar e acompanhar manutenções do veículo.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
}
