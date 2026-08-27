import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const nonNeg = (max = 100_000_000) => z.number().min(0).max(max).default(0);

/**
 * Registrar métricas do dia (§28). Rápido: data + oferta + gasto/leads/
 * vendas/receita. Impressões, cliques, refunds, gateway e outros custos
 * ficam em "Mais detalhes".
 */
export const dailyMetricFormSchema = z.object({
  date: isoDate,
  offerId: z.string().min(1, "Escolha a oferta"),
  spend: nonNeg(),
  leads: nonNeg(),
  sales: nonNeg(),
  revenue: nonNeg(),
  impressions: nonNeg(1_000_000_000),
  clicks: nonNeg(),
  refunds: nonNeg(),
  gatewayFees: nonNeg(),
  additionalCosts: nonNeg(),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length ? v : null))
    .nullable(),
});
export type DailyMetricFormOutput = z.output<typeof dailyMetricFormSchema>;
