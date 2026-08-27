import { z } from "zod";

import {
  ANGLE_STATUSES,
  CAMPAIGN_STATUSES,
  OFFER_HEALTHS,
  OFFER_STATUSES,
  PAGE_STATUSES,
  PRIORITIES,
  TRAFFIC_PLATFORMS,
} from "@/types/domain";

/** Campo de texto opcional: '' do formulario vira null no banco. */
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v && v.length ? v : null))
  .nullable();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em AAAA-MM-DD")
  .optional()
  .nullable()
  .transform((v) => v ?? null);

export const angleSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nome do ângulo é obrigatório").max(120),
  description: optionalText,
  hypothesis: optionalText,
  status: z.enum(ANGLE_STATUSES),
  result: optionalText,
});

export const landingPageSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nome da página é obrigatório").max(120),
  version: z.string().trim().min(1).max(20).default("V1"),
  url: z
    .string()
    .trim()
    .url("URL inválida")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  status: z.enum(PAGE_STATUSES),
  headline: optionalText,
});

export const campaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nome da campanha é obrigatório").max(160),
  platform: z.enum(TRAFFIC_PLATFORMS),
  account: optionalText,
  externalId: optionalText,
  status: z.enum(CAMPAIGN_STATUSES),
  startDate: isoDate,
  responsibleId: z.string().nullable().default(null),
});

/**
 * Formulario de oferta.
 *
 * `code` nao entra: e gerado pelo servidor via transacao no contador.
 * Campos de auditoria e `deletedAt` tambem nao — o repositorio cuida.
 */
export const offerFormSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(160),
  niche: optionalText,
  subNiche: optionalText,
  country: z.string().trim().min(2).max(4).default("BR"),
  language: z.string().trim().min(2).max(10).default("pt-BR"),
  mainPromise: optionalText,
  mechanism: optionalText,
  targetAudience: optionalText,
  ticketPrice: z
    .number({ error: "Ticket deve ser um número" })
    .min(0, "Ticket não pode ser negativo")
    .nullable()
    .default(null),
  status: z.enum(OFFER_STATUSES).default("minerada"),
  health: z.enum(OFFER_HEALTHS).default("saudavel"),
  priority: z.enum(PRIORITIES).default("media"),
  responsibleId: z.string().nullable().default(null),
  miningItemId: z.string().nullable().default(null),
  nextAction: optionalText,
  nextActionDue: isoDate,
  launchDate: isoDate,
  validationDate: isoDate,
  scalingDate: isoDate,
  notes: optionalText,
  angles: z.array(angleSchema).max(50).default([]),
  pages: z.array(landingPageSchema).max(30).default([]),
  campaigns: z.array(campaignSchema).max(80).default([]),
});

export type OfferFormValues = z.input<typeof offerFormSchema>;
export type OfferFormOutput = z.output<typeof offerFormSchema>;

/** Update aceita qualquer subconjunto. */
export const offerUpdateSchema = offerFormSchema.partial();
export type OfferUpdateValues = z.output<typeof offerUpdateSchema>;

/** Mudanca de status isolada — usada pelo drag-and-drop do Kanban. */
export const offerStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(OFFER_STATUSES),
});

export const offerHealthSchema = z.object({
  id: z.string().min(1),
  health: z.enum(OFFER_HEALTHS),
});
