"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireAuth, requireRead, requireWrite } from "@/lib/auth/guard";
import {
  chipFormSchema,
  chipOfferSchema,
  chipStatusSchema,
  chipUpdateSchema,
} from "@/lib/schemas/chip";
import {
  changeChipStatus,
  createChip,
  getChipCapacity,
  getChipPhoneNumber,
  listChipEvents,
  listChips,
  setChipOffer,
  updateChip,
} from "@/services/firestore/chips.repo";
import type { Actor } from "@/services/firestore/offers.repo";
import type { Chip, ChipEvent, ChipStatus, User } from "@/types/domain";

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

function revalidate() {
  revalidatePath("/chips");
  revalidatePath("/ofertas");
}

export async function listChipsAction(
  offerId?: string,
  status?: ChipStatus
): Promise<ActionResult<Chip[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listChips({ offerId, status }) };
  } catch (error) {
    return fail(error);
  }
}

export async function getChipCapacityAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getChipCapacity>>>
> {
  try {
    await requireAuth();
    return { ok: true, data: await getChipCapacity() };
  } catch (error) {
    return fail(error);
  }
}

export async function listChipEventsAction(
  chipId: string
): Promise<ActionResult<ChipEvent[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listChipEvents(chipId) };
  } catch (error) {
    return fail(error);
  }
}

export async function createChipAction(
  raw: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireWrite("ops");
    const parsed = chipFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const chip = await createChip(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true, data: { id: chip.id, code: chip.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateChipAction(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("ops");
    const parsed = chipUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Dados inválidos." };
    await updateChip(id, parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function changeChipStatusAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("ops");
    const parsed = chipStatusSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Status inválido." };
    await changeChipStatus(parsed.data.id, parsed.data.status, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setChipOfferAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("ops");
    const parsed = chipOfferSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Dados inválidos." };
    await setChipOffer(parsed.data.id, parsed.data.offerId, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Numero real — so roles autorizadas (owner/admin/operacao). */
export async function getChipPhoneNumberAction(
  id: string
): Promise<ActionResult<string | null>> {
  try {
    await requireRead("chipSecret");
    return { ok: true, data: await getChipPhoneNumber(id) };
  } catch (error) {
    return fail(error);
  }
}
