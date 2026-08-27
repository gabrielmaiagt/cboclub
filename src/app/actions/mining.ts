"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireAuth, requireWrite } from "@/lib/auth/guard";
import {
  miningConvertSchema,
  miningFormSchema,
  miningStatusSchema,
  miningUpdateSchema,
} from "@/lib/schemas/mining";
import {
  convertMiningToOffer,
  createMiningItem,
  getMiningItemById,
  listMiningItems,
  softDeleteMiningItem,
  updateMiningItem,
} from "@/services/firestore/mining.repo";
import type { Actor } from "@/services/firestore/offers.repo";
import type { MiningItem, User } from "@/types/domain";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
}

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Erro inesperado." };
}

function actorFrom(ctx: { uid: string; user: User }): Actor {
  return { uid: ctx.uid, name: ctx.user.fullName || ctx.user.email };
}

function revalidate(code?: string) {
  revalidatePath("/mineracao");
  if (code) revalidatePath(`/mineracao/${code}`);
  revalidatePath("/ofertas");
}

export async function listMiningItemsAction(): Promise<ActionResult<MiningItem[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listMiningItems() };
  } catch (error) {
    return fail(error);
  }
}

export async function createMiningItemAction(
  raw: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireWrite("traffic");
    const parsed = miningFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const item = await createMiningItem(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true, data: { id: item.id, code: item.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateMiningItemAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("traffic");
    const parsed = miningUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    const existing = await getMiningItemById(id);
    if (!existing) return { ok: false, error: "Não encontrada." };
    await updateMiningItem(id, parsed.data, actorFrom(ctx));
    revalidate(existing.code);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function changeMiningStatusAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("traffic");
    const parsed = miningStatusSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Status inválido." };
    const existing = await getMiningItemById(parsed.data.id);
    if (!existing) return { ok: false, error: "Não encontrada." };
    await updateMiningItem(
      parsed.data.id,
      { status: parsed.data.status },
      actorFrom(ctx)
    );
    revalidate(existing.code);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Transformar em oferta (§13, §15). */
export async function convertMiningToOfferAction(
  raw: unknown
): Promise<ActionResult<{ offerCode: string }>> {
  try {
    const ctx = await requireWrite("offers");
    const parsed = miningConvertSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Dados inválidos." };
    const offer = await convertMiningToOffer(
      parsed.data.id,
      parsed.data.ticketPrice,
      actorFrom(ctx)
    );
    revalidate();
    return { ok: true, data: { offerCode: offer.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveMiningItemAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("traffic");
    await softDeleteMiningItem(id, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
