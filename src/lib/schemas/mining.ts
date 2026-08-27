import { z } from "zod";

import { MINING_STATUSES } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v && v.length ? v : null))
  .nullable();

const optionalUrl = z
  .string()
  .trim()
  .url("URL inválida")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

/** Quick capture (§18): nome + link + por que chamou atenção. */
export const miningFormSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome").max(160),
  url: optionalUrl,
  whyInteresting: optionalText,
  status: z.enum(MINING_STATUSES).default("salva"),
});
export type MiningFormOutput = z.output<typeof miningFormSchema>;

/** Detalhes opcionais, preenchidos depois (§18). */
export const miningUpdateSchema = z.object({
  niche: optionalText.optional(),
  country: z.string().trim().max(4).nullable().optional(),
  targetAudience: optionalText.optional(),
  promise: optionalText.optional(),
  mechanism: optionalText.optional(),
  price: z.number().min(0).nullable().optional(),
  advertiser: optionalText.optional(),
  score: z.number().int().min(1).max(5).nullable().optional(),
  notes: optionalText.optional(),
  status: z.enum(MINING_STATUSES).optional(),
});
export type MiningUpdateValues = z.output<typeof miningUpdateSchema>;

export const miningStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(MINING_STATUSES),
});

/** Transformar/modelar (§13, §15): oferta minerada -> oferta interna. */
export const miningConvertSchema = z.object({
  id: z.string().min(1),
  ticketPrice: z.number().min(0).nullable().optional(),
});
