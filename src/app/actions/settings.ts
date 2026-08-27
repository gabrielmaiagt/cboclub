"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AuthError, requireWrite } from "@/lib/auth/guard";
import {
  addCreativeFormat,
  addLibraryAngle,
  addTag,
  updateAppSettings,
} from "@/services/firestore/settings.repo";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Erro inesperado." };
}

const appSettingsSchema = z.object({
  currency: z.string().trim().min(3).max(4).optional(),
  defaultCountry: z.string().trim().min(2).max(4).optional(),
  copyWordsPerMinute: z.number().min(50).max(400).optional(),
  chipsTarget: z.number().min(1).max(1000).optional(),
});

export async function updateAppSettingsAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("admin");
    const parsed = appSettingsSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await updateAppSettings(parsed.data, ctx.uid);
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addCreativeFormatAction(name: string): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("admin");
    if (!name.trim()) return { ok: false, error: "Informe um nome." };
    await addCreativeFormat(name.trim(), ctx.uid);
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addTagAction(name: string): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("admin");
    if (!name.trim()) return { ok: false, error: "Informe um nome." };
    await addTag(name.trim(), "slate", ctx.uid);
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addLibraryAngleAction(
  name: string,
  description: string
): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("admin");
    if (!name.trim()) return { ok: false, error: "Informe um nome." };
    await addLibraryAngle(name.trim(), description.trim() || null, ctx.uid);
    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
