import { z } from "zod";

import { SCRIPT_STATUSES } from "@/types/domain";

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v && v.length ? v : null))
  .nullable();

/** Conteudo de uma versao. Body maior: uma copy inteira cabe aqui. */
const versionContent = {
  hook: optionalText,
  body: z.string().trim().max(20000).default(""),
  cta: optionalText,
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em AAAA-MM-DD")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

/**
 * Criacao de copy: o conteudo que vira a V1 + briefing opcional (§4).
 * Titulo e OPCIONAL — quando vazio, o servidor deriva do hook.
 * wordCount e duracao sao computados no servidor (fonte da verdade).
 */
export const scriptFormSchema = z
  .object({
    offerId: z.string().min(1, "Escolha a oferta"),
    angleId: z.string().nullable().default(null),
    title: z
      .string()
      .trim()
      .max(160)
      .optional()
      .transform((v) => (v && v.length ? v : null))
      .nullable(),
    status: z.enum(SCRIPT_STATUSES).default("rascunho"),
    responsibleId: z.string().nullable().default(null),
    notes: optionalText,
    // Briefing de producao — nada disso bloqueia o cadastro
    suggestedFormat: z.string().trim().nullable().default(null),
    editingInstructions: optionalText,
    referenceLinks: optionalText,
    referenceVideoPath: z.string().trim().nullable().default(null),
    deadline: isoDate.default(null),
    sourceReferenceId: z.string().nullable().default(null),
    ...versionContent,
  })
  .refine(
    (data) =>
      (data.hook && data.hook.length) ||
      data.body.length ||
      (data.cta && data.cta.length),
    { message: "Escreva ao menos hook, corpo ou CTA.", path: ["body"] }
  );

export type ScriptFormValues = z.input<typeof scriptFormSchema>;
export type ScriptFormOutput = z.output<typeof scriptFormSchema>;

/**
 * Nova versao (§20). Sempre cria V(n+1) — nunca ha update de conteudo.
 */
export const scriptVersionSchema = z.object({
  scriptId: z.string().min(1),
  changeNote: optionalText,
  ...versionContent,
});

export type ScriptVersionValues = z.output<typeof scriptVersionSchema>;

/**
 * Metadados editaveis sem gerar versao: titulo, status, angulo,
 * responsavel e notas. Conteudo NAO passa por aqui.
 */
export const scriptMetaSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  status: z.enum(SCRIPT_STATUSES).optional(),
  angleId: z.string().nullable().optional(),
  responsibleId: z.string().nullable().optional(),
  notes: optionalText.optional(),
  suggestedFormat: z.string().trim().nullable().optional(),
  editingInstructions: optionalText.optional(),
  referenceLinks: optionalText.optional(),
  referenceVideoPath: z.string().trim().nullable().optional(),
  deadline: isoDate.optional(),
});

export type ScriptMetaValues = z.output<typeof scriptMetaSchema>;
