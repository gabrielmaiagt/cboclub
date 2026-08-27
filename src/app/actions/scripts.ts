"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireWrite } from "@/lib/auth/guard";
import {
  scriptFormSchema,
  scriptMetaSchema,
  scriptVersionSchema,
} from "@/lib/schemas/script";
import type { Actor } from "@/services/firestore/offers.repo";
import {
  addScriptVersion,
  createScript,
  getScriptById,
  softDeleteScript,
  updateScriptMeta,
} from "@/services/firestore/scripts.repo";
import type { User } from "@/types/domain";

/**
 * Server actions de Copies.
 * O Admin SDK ignora Security Rules: TODA action abre com requireWrite.
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

export async function createScriptAction(
  raw: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = scriptFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os campos destacados.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const script = await createScript(parsed.data, actorFrom(ctx));
    revalidatePath("/copies");
    return { ok: true, data: { id: script.id, code: script.code } };
  } catch (error) {
    return fail(error);
  }
}

/** Nova versao V(n+1). Conteudo antigo permanece intacto (§20). */
export async function addScriptVersionAction(
  raw: unknown
): Promise<ActionResult<{ version: number }>> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = scriptVersionSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os campos destacados.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await getScriptById(parsed.data.scriptId);
    if (!existing) return { ok: false, error: "Copy não encontrada." };

    const { version } = await addScriptVersion(parsed.data, actorFrom(ctx));
    revalidatePath("/copies");
    revalidatePath(`/copies/${existing.code}`);
    return { ok: true, data: { version } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateScriptMetaAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = scriptMetaSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Dados inválidos." };
    }

    const existing = await getScriptById(id);
    if (!existing) return { ok: false, error: "Copy não encontrada." };

    await updateScriptMeta(id, parsed.data, actorFrom(ctx));
    revalidatePath("/copies");
    revalidatePath(`/copies/${existing.code}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveScriptAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");
    await softDeleteScript(id, actorFrom(ctx));
    revalidatePath("/copies");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
