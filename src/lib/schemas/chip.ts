import { z } from "zod";

import { CHIP_STATUSES } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v && v.length ? v : null))
  .nullable();

/** Quick capture (§41): numero + status + responsavel. So. */
export const chipFormSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(8, "Informe o número do chip")
    .max(20),
  status: z.enum(CHIP_STATUSES).default("novo"),
  responsibleId: z.string().nullable().default(null),
  operator: optionalText,
  notes: optionalText,
});
export type ChipFormOutput = z.output<typeof chipFormSchema>;

export const chipUpdateSchema = z.object({
  operator: optionalText.optional(),
  responsibleId: z.string().nullable().optional(),
  notes: optionalText.optional(),
});
export type ChipUpdateValues = z.output<typeof chipUpdateSchema>;

export const chipStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CHIP_STATUSES),
});

/** Trocar a oferta vinculada a um chip Ativo (§42). */
export const chipOfferSchema = z.object({
  id: z.string().min(1),
  offerId: z.string().nullable(),
});
