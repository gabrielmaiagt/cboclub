import { shiftDate } from "@/lib/format";

/**
 * Periodo de visualizacao de metricas (Visao Geral e pagina da oferta).
 * "all" busca desde uma data bem no passado — cobre qualquer historico
 * real da operacao sem precisar de uma query "sem filtro" separada.
 */
export const PERIODS = ["today", "yesterday", "7d", "month", "all"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7d": "7 dias",
  month: "Este mês",
  all: "Total",
};

export const PERIOD_COMPARISON_LABELS: Record<Period, string> = {
  today: "vs. ontem",
  yesterday: "vs. anteontem",
  "7d": "vs. 7 dias anteriores",
  month: "vs. período anterior",
  all: "",
};

export function parsePeriod(value: string | undefined): Period {
  return (PERIODS as readonly string[]).includes(value ?? "")
    ? (value as Period)
    : "today";
}

/** Intervalo [from, to] (inclusive, YYYY-MM-DD) para o periodo, ancorado em `today`. */
export function periodRange(
  period: Period,
  today: string
): { from: string; to: string } {
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = shiftDate(today, -1);
      return { from: y, to: y };
    }
    case "7d":
      return { from: shiftDate(today, -6), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "all":
      return { from: "2000-01-01", to: today };
  }
}

/**
 * Intervalo imediatamente anterior, do mesmo tamanho — base da
 * comparacao "vs. periodo anterior". "all" nao tem anterior.
 */
export function previousPeriodRange(
  period: Period,
  today: string
): { from: string; to: string } | null {
  if (period === "all") return null;
  const { from, to } = periodRange(period, today);
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  const prevTo = shiftDate(from, -1);
  const prevFrom = shiftDate(prevTo, -(days - 1));
  return { from: prevFrom, to: prevTo };
}
