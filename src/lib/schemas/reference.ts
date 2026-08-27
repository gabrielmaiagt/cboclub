import { z } from "zod";

import { REFERENCE_STATUSES } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(20000)
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

/**
 * Quick capture (§9): salvar uma referencia deve levar segundos.
 * Exige apenas link OU arquivo; todo o resto vem depois.
 */
export const referenceQuickSchema = z
  .object({
    url: optionalUrl,
    storagePath: z.string().trim().nullable().default(null),
    whySaved: optionalText,
    transcription: optionalText,
    miningItemId: z.string().nullable().default(null),
    status: z.enum(REFERENCE_STATUSES).default("salvo"),
  })
  .refine((data) => data.url || data.storagePath, {
    message: "Informe um link ou suba um arquivo.",
    path: ["url"],
  });

export type ReferenceQuickValues = z.output<typeof referenceQuickSchema>;

/** Edicao completa — todos os metadados opcionais (§9, §11). */
export const referenceUpdateSchema = z.object({
  url: optionalUrl.optional(),
  storagePath: z.string().trim().nullable().optional(),
  whySaved: optionalText.optional(),
  transcription: optionalText.optional(),
  analysis: optionalText.optional(),
  miningItemId: z.string().nullable().optional(),
  status: z.enum(REFERENCE_STATUSES).optional(),
  advertiser: optionalText.optional(),
  format: z.string().trim().nullable().optional(),
  source: optionalText.optional(),
  notes: optionalText.optional(),
});

export type ReferenceUpdateValues = z.output<typeof referenceUpdateSchema>;

export const referenceStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(REFERENCE_STATUSES),
});

/** "Criar modelagem" (§12): referencia -> copy interna rascunho. */
export const modelagemSchema = z.object({
  referenceId: z.string().min(1),
  offerId: z.string().min(1, "Escolha a oferta interna"),
});
