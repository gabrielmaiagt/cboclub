import { z } from "zod";

import { EXPENSE_CATEGORIES, NON_PNL_EXPENSE_CATEGORIES, REVENUE_SOURCES } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v && v.length ? v : null))
  .nullable();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

/** Quick capture de despesa (§34): valor + categoria + data. So. */
export const expenseFormSchema = z.object({
  amount: z.number({ error: "Informe o valor" }).positive("Valor deve ser positivo"),
  category: z.enum(EXPENSE_CATEGORIES),
  date: isoDate.default(() => new Date().toISOString().slice(0, 10)),
  description: optionalText,
  offerId: z.string().nullable().default(null),
  recurring: z.boolean().default(false),
  receiptPath: z.string().trim().nullable().default(null),
  notes: optionalText,
});
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>;

export const revenueFormSchema = z.object({
  amount: z.number({ error: "Informe o valor" }).positive(),
  source: z.enum(REVENUE_SOURCES).default("outro"),
  date: isoDate.default(() => new Date().toISOString().slice(0, 10)),
  description: optionalText,
  offerId: z.string().nullable().default(null),
  notes: optionalText,
});
export type RevenueFormOutput = z.output<typeof revenueFormSchema>;

export const contributionFormSchema = z.object({
  amount: z.number({ error: "Informe o valor" }).positive(),
  partnerId: z.string().min(1, "Escolha o sócio"),
  date: isoDate.default(() => new Date().toISOString().slice(0, 10)),
  notes: optionalText,
});
export type ContributionFormOutput = z.output<typeof contributionFormSchema>;

export const distributionFormSchema = z.object({
  amount: z.number({ error: "Informe o valor" }).positive(),
  partnerId: z.string().min(1, "Escolha o sócio"),
  date: isoDate.default(() => new Date().toISOString().slice(0, 10)),
  period: z.string().trim().max(20).nullable().default(null),
  notes: optionalText,
});
export type DistributionFormOutput = z.output<typeof distributionFormSchema>;

export const partnerFormSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(120),
  ownershipPercentage: z.number().min(0).max(100).default(0),
});
export type PartnerFormOutput = z.output<typeof partnerFormSchema>;

export const recurringCostFormSchema = z.object({
  name: z.string().trim().min(2, "Nome é obrigatório").max(160),
  category: z.string().trim().min(1).default("outros"),
  amount: z.number({ error: "Informe o valor" }).min(0),
  frequency: z.enum(["mensal", "anual"]).default("mensal"),
  nextChargeDate: isoDate.nullable().default(null),
  responsibleId: z.string().nullable().default(null),
  active: z.boolean().default(true),
});
export type RecurringCostFormOutput = z.output<typeof recurringCostFormSchema>;

export { NON_PNL_EXPENSE_CATEGORIES };
