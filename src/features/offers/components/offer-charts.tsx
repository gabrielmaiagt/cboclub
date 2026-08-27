"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { money, multiplier, shortDate } from "@/lib/format";

interface SeriesPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number | null;
}

/**
 * Graficos da oferta (§49): Receita x Gasto em barras + ROAS em linha
 * no eixo secundario. Um grafico so, duas leituras.
 */
export function OfferCharts({ series }: { series: SeriesPoint[] }) {
  if (series.length === 0) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center rounded-lg border border-dashed border-border/70">
        <p className="text-sm text-muted-foreground">
          Sem métricas nos últimos 30 dias.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-status-progress" /> Gasto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-status-win" /> Receita
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded bg-status-warn" /> ROAS
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="money"
            tickFormatter={(v: number) => `${Math.round(v)}`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <YAxis yAxisId="roas" orientation="right" hide domain={[0, "auto"]} />
          <Tooltip
            cursor={{ fill: "var(--accent)", opacity: 0.35 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(label) => shortDate(String(label))}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : null;
              if (name === "roas") return [multiplier(n), "ROAS"];
              if (name === "spend") return [money(n ?? 0), "Gasto"];
              return [money(n ?? 0), "Receita"];
            }}
          />
          <Bar
            yAxisId="money"
            dataKey="spend"
            fill="var(--status-progress)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            yAxisId="money"
            dataKey="revenue"
            fill="var(--status-win)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Line
            yAxisId="roas"
            dataKey="roas"
            stroke="var(--status-warn)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
