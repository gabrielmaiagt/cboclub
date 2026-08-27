import { z } from "zod";

import { CREATIVE_STATUSES, TRAFFIC_PLATFORMS } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(2000)
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
 * Formulario de criativo.
 * `code` e gerado no servidor; auditoria e deletedAt sao do repositorio.
 */
export const creativeFormSchema = z.object({
  offerId: z.string().min(1, "Escolha a oferta"),
  angleId: z.string().nullable().default(null),
  scriptId: z.string().nullable().default(null),
  scriptVersion: z
    .number()
    .int()
    .min(1)
    .nullable()
    .default(null),
  // Titulo OPCIONAL (quick capture §7): vazio -> servidor herda da copy
  // vinculada ou usa "Sem título"
  title: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => (v && v.length ? v : null))
    .nullable(),
  hook: optionalText,
  format: z.string().trim().nullable().default(null),
  platform: z.enum(TRAFFIC_PLATFORMS).default("meta"),
  durationSeconds: z
    .number({ error: "Duração deve ser um número" })
    .int()
    .min(0)
    .nullable()
    .default(null),
  editorId: z.string().nullable().default(null),
  responsibleId: z.string().nullable().default(null),
  status: z.enum(CREATIVE_STATUSES).default("ideia"),
  storagePath: z.string().trim().nullable().default(null),
  thumbnailPath: z.string().trim().nullable().default(null),
  sourceUrl: optionalUrl,
  inspirationUrl: optionalUrl,
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  notes: optionalText,
});

export type CreativeFormValues = z.input<typeof creativeFormSchema>;
export type CreativeFormOutput = z.output<typeof creativeFormSchema>;

export const creativeUpdateSchema = creativeFormSchema.partial();
export type CreativeUpdateValues = z.output<typeof creativeUpdateSchema>;

/** Drag-and-drop do Kanban e menu de status. */
export const creativeStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CREATIVE_STATUSES),
});
