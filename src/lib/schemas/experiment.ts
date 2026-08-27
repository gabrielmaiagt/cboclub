import { z } from "zod";

import { EXPERIMENT_RESULTS, EXPERIMENT_STATUSES, EXPERIMENT_VARIABLES } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v && v.length ? v : null))
  .nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

const num = (max = 10_000_000) =>
  z.number().min(0).max(max).optional().default(0);

/**
 * Quick capture do teste: oferta + nome + hipotese + variavel.
 * Numeros e datas podem vir depois; resultado/conclusao/proxima acao
 * so entram quando o teste e concluido (regra abaixo).
 */
const experimentBaseSchema = z.object({
  offerId: z.string().min(1, "Escolha a oferta"),
  name: z.string().trim().min(2, "Dê um nome ao teste").max(160),
  hypothesis: z.string().trim().min(2, "Descreva a hipótese").max(2000),
  variable: z.enum(EXPERIMENT_VARIABLES).default("angulo"),
  status: z.enum(EXPERIMENT_STATUSES).default("planejado"),
  responsibleId: z.string().nullable().default(null),
  startDate: isoDate.default(null),
  endDate: isoDate.default(null),
  spend: num(),
  leads: num(),
  sales: num(),
  revenue: num(),
  result: z.enum(EXPERIMENT_RESULTS).nullable().default(null),
  conclusion: optionalText,
  nextAction: optionalText,
});

/** Regra §24: nao concluir sem resultado + conclusao + proxima acao. */
function requiresLearningOnConclude(data: {
  status?: string;
  result?: string | null;
  conclusion?: string | null;
  nextAction?: string | null;
}) {
  return (
    data.status !== "concluido" ||
    (data.result != null && !!data.conclusion && !!data.nextAction)
  );
}
const learningRefinement = {
  message: "Para concluir, registre resultado, conclusão e próxima ação (§24).",
  path: ["conclusion"],
};

export const experimentFormSchema = experimentBaseSchema.refine(
  requiresLearningOnConclude,
  learningRefinement
);
export type ExperimentFormValues = z.input<typeof experimentFormSchema>;
export type ExperimentFormOutput = z.output<typeof experimentFormSchema>;

export const experimentUpdateSchema = experimentBaseSchema
  .partial()
  .refine(requiresLearningOnConclude, learningRefinement);
export type ExperimentUpdateValues = z.output<typeof experimentUpdateSchema>;
