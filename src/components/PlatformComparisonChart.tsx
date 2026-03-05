import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface DailyRecord {
  uber_rides: number;
  uber_amount: number;
  ninety_nine_rides: number;
  ninety_nine_amount: number;
  indrive_rides: number;
  indrive_amount: number;
  private_rides: number;
  private_amount: number;
}

interface PlatformComparisonChartProps {
  records: DailyRecord[];
}

const PLATFORM_COLORS = {
  uber: "hsl(0, 0%, 0%)",
  ninety_nine: "hsl(45, 93%, 47%)",
  indrive: "hsl(213, 32%, 18%)",
  private: "hsl(142, 64%, 38%)",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PlatformComparisonChart({
  records,
}: PlatformComparisonChartProps) {
  const stats = useMemo(() => {
    const totals = {
      uber: { rides: 0, amount: 0 },
      ninety_nine: { rides: 0, amount: 0 },
      indrive: { rides: 0, amount: 0 },
      private: { rides: 0, amount: 0 },
    };

    records.forEach((r) => {
      totals.uber.rides += r.uber_rides;
      totals.uber.amount += r.uber_amount;
      totals.ninety_nine.rides += r.ninety_nine_rides;
      totals.ninety_nine.amount += r.ninety_nine_amount;
      totals.indrive.rides += r.indrive_rides;
      totals.indrive.amount += r.indrive_amount;
      totals.private.rides += r.private_rides;
      totals.private.amount += r.private_amount;
    });

    return totals;
  }, [records]);

  const pieData = useMemo(() => {
    return [
      { name: "Uber", value: stats.uber.amount },
      { name: "99", value: stats.ninety_nine.amount },
      { name: "InDrive", value: stats.indrive.amount },
      { name: "Privado", value: stats.private.amount },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const barData = useMemo(() => {
    return [
      {
        name: "Uber",
        corridas: stats.uber.rides,
        faturamento: stats.uber.amount,
        ticketMedio: stats.uber.rides > 0 ? stats.uber.amount / stats.uber.rides : 0,
      },
      {
        name: "99",
        corridas: stats.ninety_nine.rides,
        faturamento: stats.ninety_nine.amount,
        ticketMedio: stats.ninety_nine.rides > 0 ? stats.ninety_nine.amount / stats.ninety_nine.rides : 0,
      },
      {
        name: "InDrive",
        corridas: stats.indrive.rides,
        faturamento: stats.indrive.amount,
        ticketMedio: stats.indrive.rides > 0 ? stats.indrive.amount / stats.indrive.rides : 0,
      },
      {
        name: "Privado",
        corridas: stats.private.rides,
        faturamento: stats.private.amount,
        ticketMedio: stats.private.rides > 0 ? stats.private.amount / stats.private.rides : 0,
      },
    ].filter((d) => d.corridas > 0);
  }, [stats]);

  if (pieData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Pie Chart */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            💰 Faturamento por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  `${name}: ${fmt(value)}`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      Object.values(PLATFORM_COLORS)[
                        Object.keys(PLATFORM_COLORS).indexOf(
                          entry.name.toLowerCase().replace(" ", "_")
                        )
                      ] || "#8884d8"
                    }
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => fmt(value)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart - Ticket Médio */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            🎯 Ticket Médio por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="name"
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
                dataKey="ticketMedio"
                fill="hsl(var(--primary))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            📊 Resumo por Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-3">
            {barData.map((platform) => (
              <div
                key={platform.name}
                className="rounded-lg bg-muted/60 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {platform.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {platform.corridas} corridas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">
                    {fmt(platform.faturamento)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(platform.ticketMedio)}/corrida
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
