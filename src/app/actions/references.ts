"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireWrite } from "@/lib/auth/guard";
import {
  modelagemSchema,
  referenceQuickSchema,
  referenceStatusSchema,
  referenceUpdateSchema,
} from "@/lib/schemas/reference";
import type { Actor } from "@/services/firestore/offers.repo";
import {
  createModelagem,
  createReference,
  getReferenceById,
  softDeleteReference,
  updateReference,
} from "@/services/firestore/references.repo";
import type { User } from "@/types/domain";

/**
 * Server actions do swipe file.
 * O Admin SDK ignora Security Rules: TODA action abre com requireWrite.
 * Grupo "creative": owner, admin, criativo e trafego salvam referencias.
 */

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
}

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Erro inesperado ao salvar." };
}

function actorFrom(ctx: { uid: string; user: User }): Actor {
  return { uid: ctx.uid, name: ctx.user.fullName || ctx.user.email };
}

export async function createReferenceAction(
  raw: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = referenceQuickSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const reference = await createReference(parsed.data, actorFrom(ctx));
    revalidatePath("/referencias");
    return { ok: true, data: { id: reference.id, code: reference.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateReferenceAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = referenceUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Dados inválidos." };
    }

    const existing = await getReferenceById(id);
    if (!existing) return { ok: false, error: "Referência não encontrada." };

    await updateReference(id, parsed.data, actorFrom(ctx));
    revalidatePath("/referencias");
    revalidatePath(`/referencias/${existing.code}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function changeReferenceStatusAction(
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = referenceStatusSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Status inválido." };

    const existing = await getReferenceById(parsed.data.id);
    if (!existing) return { ok: false, error: "Referência não encontrada." };

    await updateReference(
      parsed.data.id,
      { status: parsed.data.status },
      actorFrom(ctx)
    );
    revalidatePath("/referencias");
    revalidatePath(`/referencias/${existing.code}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * "Criar modelagem" (§12): REF -> copy interna rascunho, com a relacao
 * preservada. Devolve o codigo da copy para redirecionar ao editor.
 */
export async function createModelagemAction(
  raw: unknown
): Promise<ActionResult<{ scriptCode: string }>> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = modelagemSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Escolha a oferta interna." };
    }

    const script = await createModelagem(
      parsed.data.referenceId,
      parsed.data.offerId,
      actorFrom(ctx)
    );

    revalidatePath("/referencias");
    revalidatePath("/copies");
    return { ok: true, data: { scriptCode: script.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveReferenceAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");
    await softDeleteReference(id, actorFrom(ctx));
    revalidatePath("/referencias");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
