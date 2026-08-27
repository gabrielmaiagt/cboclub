"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireAuth, requireWrite } from "@/lib/auth/guard";
import {
  offerFormSchema,
  offerHealthSchema,
  offerStatusSchema,
  offerUpdateSchema,
} from "@/lib/schemas/offer";
import { listActivityByOffer } from "@/services/firestore/activity.repo";
import {
  changeOfferStatus,
  createOffer,
  getOfferByCode,
  getOfferById,
  listOffers,
  setOfferHealth,
  softDeleteOffer,
  updateOffer,
  type Actor,
} from "@/services/firestore/offers.repo";
import { getUserDirectory } from "@/services/firestore/users.repo";
import type { ActivityEntry, Offer, User } from "@/types/domain";

/**
 * Server actions de Ofertas.
 *
 * TODA action comeca por um `require*` do guard. O Admin SDK ignora as
 * Security Rules, entao sem esse check qualquer request autenticado
 * poderia escrever em qualquer coisa. O guard e a unica barreira aqui.
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

// ── Leitura ─────────────────────────────────────────────────────────

export async function listOffersAction(): Promise<ActionResult<Offer[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listOffers() };
  } catch (error) {
    return fail(error);
  }
}

export async function getOfferAction(
  code: string
): Promise<ActionResult<{ offer: Offer; activity: ActivityEntry[] }>> {
  try {
    await requireAuth();

    const offer = await getOfferByCode(code);
    if (!offer) return { ok: false, error: "Oferta não encontrada." };

    const activity = await listActivityByOffer(offer.id);
    return { ok: true, data: { offer, activity } };
  } catch (error) {
    return fail(error);
  }
}

/** Diretorio de usuarios para resolver responsavel sem N leituras. */
export async function listUserDirectoryAction(): Promise<ActionResult<User[]>> {
  try {
    await requireAuth();
    const directory = await getUserDirectory();
    return { ok: true, data: [...directory.values()].filter((u) => u.active) };
  } catch (error) {
    return fail(error);
  }
}

// ── Escrita ─────────────────────────────────────────────────────────

export async function createOfferAction(
  raw: unknown
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireWrite("offers");

    const parsed = offerFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os campos destacados.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const offer = await createOffer(parsed.data, actorFrom(ctx));

    revalidatePath("/ofertas");
    return { ok: true, data: { id: offer.id, code: offer.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateOfferAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("offers");

    const parsed = offerUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Confira os campos destacados.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const existing = await getOfferById(id);
    if (!existing) return { ok: false, error: "Oferta não encontrada." };

    await updateOffer(id, parsed.data, actorFrom(ctx));

    revalidatePath("/ofertas");
    revalidatePath(`/ofertas/${existing.code}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Drag-and-drop do Kanban. */
export async function changeOfferStatusAction(
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("offers");

    const parsed = offerStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Status inválido." };
    }

    await changeOfferStatus(parsed.data.id, parsed.data.status, actorFrom(ctx));

    revalidatePath("/ofertas");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Semáforo de saúde da oferta (§50) — manual, sem algoritmo. */
export async function setOfferHealthAction(
  raw: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("offers");

    const parsed = offerHealthSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Saúde inválida." };

    await setOfferHealth(parsed.data.id, parsed.data.health, actorFrom(ctx));

    revalidatePath("/ofertas");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveOfferAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("offers");
    await softDeleteOffer(id, actorFrom(ctx));

    revalidatePath("/ofertas");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
