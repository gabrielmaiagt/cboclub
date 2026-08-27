"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireAuth, requireWrite } from "@/lib/auth/guard";
import {
  experimentFormSchema,
  experimentUpdateSchema,
} from "@/lib/schemas/experiment";
import {
  createExperiment,
  getExperimentById,
  listExperiments,
  updateExperiment,
} from "@/services/firestore/experiments.repo";
import type { Actor } from "@/services/firestore/offers.repo";
import type { Experiment, ExperimentStatus, User } from "@/types/domain";

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

function revalidate(offerCode?: string) {
  revalidatePath("/ofertas");
  if (offerCode) revalidatePath(`/ofertas/${offerCode}`);
}

export async function listExperimentsAction(
  offerId?: string,
  status?: ExperimentStatus
): Promise<ActionResult<Experiment[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listExperiments({ offerId, status }) };
  } catch (error) {
    return fail(error);
  }
}

export async function createExperimentAction(
  raw: unknown,
  offerCode?: string
): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const ctx = await requireWrite("traffic");
    const parsed = experimentFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const exp = await createExperiment(parsed.data, actorFrom(ctx));
    revalidate(offerCode);
    return { ok: true, data: { id: exp.id, code: exp.code } };
  } catch (error) {
    return fail(error);
  }
}

export async function updateExperimentAction(
  id: string,
  raw: unknown,
  offerCode?: string
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("traffic");
    const parsed = experimentUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    const existing = await getExperimentById(id);
    if (!existing) return { ok: false, error: "Teste não encontrado." };
    await updateExperiment(id, parsed.data, actorFrom(ctx));
    revalidate(offerCode);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Concluir teste: atalho que exige result+conclusion+nextAction juntos. */
export async function concludeExperimentAction(
  id: string,
  raw: {
    result: string;
    conclusion: string;
    nextAction: string;
  },
  offerCode?: string
): Promise<ActionResult> {
  return updateExperimentAction(
    id,
    { status: "concluido", ...raw },
    offerCode
  );
}
