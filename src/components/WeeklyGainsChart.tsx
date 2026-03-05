import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeeklyGainsChartProps {
  records: Array<{
    date: string;
    lucro_liquido: number | null;
    tempo_ativo_segundos: number | null;
  }>;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function WeeklyGainsChart({ records }: WeeklyGainsChartProps) {
  const chartData = useMemo(() => {
    // Get last 7 days including today
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      return format(date, "yyyy-MM-dd");
    });

    return last7Days.map((dateStr) => {
      const record = records.find((r) => r.date === dateStr);
      return {
        date: format(parseISO(dateStr), "EEE", { locale: ptBR }).substring(0, 3),
        fullDate: dateStr,
        lucro: record?.lucro_liquido ?? 0,
      };
    });
  }, [records]);

  const totalWeekly = chartData.reduce((sum, d) => sum + d.lucro, 0);
  const avgDaily = chartData.length > 0 ? totalWeekly / chartData.length : 0;
  const maxDay = Math.max(...chartData.map((d) => d.lucro), 0);

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          📈 Ganhos - Últimos 7 Dias
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis hide />
            <Tooltip
              formatter={(value: number) => fmt(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar
              dataKey="lucro"
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Total
            </p>
            <p className="text-sm font-bold text-primary">{fmt(totalWeekly)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Média
            </p>
            <p className="text-sm font-bold text-foreground">{fmt(avgDaily)}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Máximo
            </p>
            <p className="text-sm font-bold text-primary">{fmt(maxDay)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
