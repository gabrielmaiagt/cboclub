"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireWrite } from "@/lib/auth/guard";
import { dailyMetricFormSchema } from "@/lib/schemas/metrics";
import type { Actor } from "@/services/firestore/offers.repo";
import { upsertDailyMetric } from "@/services/firestore/metrics.repo";
import type { User } from "@/types/domain";

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

/** Registrar métricas do dia (§28) — o mesmo dia/oferta faz upsert. */
export async function upsertDailyMetricAction(
  raw: unknown,
  offerCode?: string
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("traffic");
    const parsed = dailyMetricFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    await upsertDailyMetric(parsed.data, actorFrom(ctx));
    revalidatePath("/");
    revalidatePath("/ofertas");
    if (offerCode) revalidatePath(`/ofertas/${offerCode}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
