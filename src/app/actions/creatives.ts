"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireWrite } from "@/lib/auth/guard";
import {
  creativeFormSchema,
  creativeStatusSchema,
  creativeUpdateSchema,
} from "@/lib/schemas/creative";
import {
  changeCreativeStatus,
  createCreative,
  getCreativeById,
  softDeleteCreative,
  updateCreative,
} from "@/services/firestore/creatives.repo";
import type { Actor } from "@/services/firestore/offers.repo";
import type { User } from "@/types/domain";

/**
 * Server actions de Criativos.
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

function revalidate(code?: string) {
  revalidatePath("/criativos");
  if (code) revalidatePath(`/criativos/${code}`);
}

export async function createCreativeAction(
  raw: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = creativeFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os campos destacados.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const creative = await createCreative(parsed.data, actorFrom(ctx));
    revalidate();
    revalidatePath(`/ofertas`);
    return { ok: true, data: { id: creative.id, code: creative.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateCreativeAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = creativeUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os campos destacados.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const existing = await getCreativeById(id);
    if (!existing) return { ok: false, error: "Criativo não encontrado." };

    await updateCreative(id, parsed.data, actorFrom(ctx));
    revalidate(existing.code);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Drag-and-drop do Kanban e menu de status. */
export async function changeCreativeStatusAction(
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");

    const parsed = creativeStatusSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Status inválido." };

    const existing = await getCreativeById(parsed.data.id);
    if (!existing) return { ok: false, error: "Criativo não encontrado." };

    await changeCreativeStatus(parsed.data.id, parsed.data.status, actorFrom(ctx));
    revalidate(existing.code);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveCreativeAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("creative");
    await softDeleteCreative(id, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
