import { z } from "zod";

import {
  DECISION_TYPES,
  PRIORITIES,
  SOP_CATEGORIES,
  TASK_STATUSES,
  TOOL_CATEGORIES,
} from "@/types/domain";

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

/** Quick capture de tarefa (§45): titulo. So. */
export const taskFormSchema = z.object({
  title: z.string().trim().min(2, "Dê um título à tarefa").max(200),
  responsibleId: z.string().nullable().default(null),
  deadline: isoDate.default(null),
  status: z.enum(TASK_STATUSES).default("fazer"),
  priority: z.enum(PRIORITIES).default("media"),
  offerId: z.string().nullable().default(null),
  creativeId: z.string().nullable().default(null),
  decisionId: z.string().nullable().default(null),
  description: optionalText,
});
export type TaskFormOutput = z.output<typeof taskFormSchema>;

export const taskUpdateSchema = taskFormSchema.partial();
export type TaskUpdateValues = z.output<typeof taskUpdateSchema>;

export const taskStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(TASK_STATUSES),
});

export const decisionFormSchema = z.object({
  title: z.string().trim().min(2, "Dê um título").max(200),
  description: optionalText,
  priority: z.enum(PRIORITIES).default("media"),
  type: z.enum(DECISION_TYPES).default("operacional"),
  responsibleId: z.string().nullable().default(null),
  offerId: z.string().nullable().default(null),
});
export type DecisionFormOutput = z.output<typeof decisionFormSchema>;

export const decisionResolveSchema = z.object({
  id: z.string().min(1),
  resolution: z.string().trim().min(2, "Descreva a resolução").max(2000),
});

export const toolFormSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(160),
  category: z.enum(TOOL_CATEGORIES).default("outros"),
  url: z
    .string()
    .trim()
    .url("URL inválida")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  monthlyCost: z.number().min(0).default(0),
  renewalDate: isoDate.default(null),
  responsibleId: z.string().nullable().default(null),
  active: z.boolean().default(true),
});
export type ToolFormOutput = z.output<typeof toolFormSchema>;

export const processFormSchema = z.object({
  title: z.string().trim().min(2, "Título é obrigatório").max(160),
  category: z.enum(SOP_CATEGORIES).default("geral"),
  content: z.string().trim().max(20000).default(""),
  active: z.boolean().default(true),
});
export type ProcessFormOutput = z.output<typeof processFormSchema>;
