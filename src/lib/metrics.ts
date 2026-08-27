/**
 * Metricas derivadas — funcoes puras.
 *
 * Nada disto e persistido no Firestore. Os documentos guardam apenas os
 * dados-base (spend, impressions, clicks, leads, sales, revenue, refunds,
 * gatewayFees, additionalCosts) e tudo abaixo e calculado na leitura.
 *
 * Uma unica implementacao: se a formula de ROI mudar, muda aqui e vale
 * para o dashboard, a pagina da oferta e o financeiro ao mesmo tempo.
 */
import type { DailyMetric } from "@/types/domain";

/** Divisao segura: devolve null em vez de Infinity ou NaN. */
export function ratio(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

export interface MetricBase {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  refunds: number;
  gatewayFees: number;
  additionalCosts: number;
}

export const EMPTY_BASE: MetricBase = {
  spend: 0,
  impressions: 0,
  clicks: 0,
  leads: 0,
  sales: 0,
  revenue: 0,
  refunds: 0,
  gatewayFees: 0,
  additionalCosts: 0,
};

export interface DerivedMetrics extends MetricBase {
  /** clicks / impressions */
  ctr: number | null;
  /** spend / clicks */
  cpc: number | null;
  /** spend / impressions * 1000 */
  cpm: number | null;
  /** spend / leads */
  cpl: number | null;
  /** spend / sales */
  cpa: number | null;
  /** receita / gasto com trafego */
  roas: number | null;
  /** revenue / sales */
  avgTicket: number | null;
  /** receita liquida menos todos os custos */
  operationalProfit: number;
  /** lucro operacional / custo total */
  roi: number | null;
}

/**
 * Soma varios registros num unico agregado de dados-base.
 * Aceita despesas alocadas (overhead da oferta) como custo adicional.
 */
export function sumBase(
  rows: readonly Partial<MetricBase>[],
  extra: Partial<MetricBase> = {}
): MetricBase {
  const total = { ...EMPTY_BASE };
  for (const row of rows) {
    total.spend += row.spend ?? 0;
    total.impressions += row.impressions ?? 0;
    total.clicks += row.clicks ?? 0;
    total.leads += row.leads ?? 0;
    total.sales += row.sales ?? 0;
    total.revenue += row.revenue ?? 0;
    total.refunds += row.refunds ?? 0;
    total.gatewayFees += row.gatewayFees ?? 0;
    total.additionalCosts += row.additionalCosts ?? 0;
  }
  total.additionalCosts += extra.additionalCosts ?? 0;
  return total;
}

/**
 * ROAS = receita / gasto com trafego  (§33)
 *
 * Nao confundir com ROI. ROAS olha so o trafego; ROI olha o custo total.
 */
export function roas(base: Pick<MetricBase, "revenue" | "spend">): number | null {
  return ratio(base.revenue, base.spend);
}

/**
 * Lucro operacional = receita - reembolsos - gateway - trafego - outros custos
 */
export function operationalProfit(base: MetricBase): number {
  return (
    base.revenue -
    base.refunds -
    base.gatewayFees -
    base.spend -
    base.additionalCosts
  );
}

/** Custo total considerado no ROI. */
export function totalCost(base: MetricBase): number {
  return base.spend + base.gatewayFees + base.additionalCosts;
}

/**
 * ROI = lucro operacional / custo total  (§33)
 */
export function roi(base: MetricBase): number | null {
  return ratio(operationalProfit(base), totalCost(base));
}

/** Calcula o pacote completo a partir dos dados-base. */
export function derive(base: MetricBase): DerivedMetrics {
  return {
    ...base,
    ctr: ratio(base.clicks, base.impressions),
    cpc: ratio(base.spend, base.clicks),
    cpm: base.impressions ? (base.spend / base.impressions) * 1000 : null,
    cpl: ratio(base.spend, base.leads),
    cpa: ratio(base.spend, base.sales),
    roas: roas(base),
    avgTicket: ratio(base.revenue, base.sales),
    operationalProfit: operationalProfit(base),
    roi: roi(base),
  };
}

/** Atalho: soma um conjunto de metricas diarias e ja deriva. */
export function deriveFrom(
  rows: readonly DailyMetric[],
  extra: Partial<MetricBase> = {}
): DerivedMetrics {
  return derive(sumBase(rows, extra));
}

/** Variacao percentual entre dois periodos. null quando nao ha base. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / Math.abs(previous);
}

/**
 * Estimativa de duracao de locucao a partir da contagem de palavras.
 * WPM vem de settings/app (padrao 150).
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function estimateDurationSeconds(
  wordCount: number,
  wordsPerMinute: number
): number {
  if (!wordsPerMinute) return 0;
  return Math.ceil((wordCount / wordsPerMinute) * 60);
}
