import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Circuitos() {
  return (
    <Layout>
      <div className="min-h-screen p-4 pb-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">🧭 Circuitos Inteligentes</h1>
            <p className="text-muted-foreground">Sistema inteligente de pontos de corrida</p>
          </div>

          <Alert className="bg-muted border-border">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Funcionalidade em desenvolvimento. Em breve você poderá configurar seus circuitos de corrida.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </Layout>
  );
}
