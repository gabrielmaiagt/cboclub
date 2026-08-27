"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireAuth, requireWrite } from "@/lib/auth/guard";
import { processFormSchema, toolFormSchema } from "@/lib/schemas/management";
import {
  createProcess,
  createTool,
  listProcesses,
  listTools,
  setToolActive,
  updateProcess,
} from "@/services/firestore/tools.repo";
import type { ProcessDoc, Tool } from "@/types/domain";

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

export async function listToolsAction(): Promise<ActionResult<Tool[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listTools() };
  } catch (error) {
    return fail(error);
  }
}

export async function createToolAction(raw: unknown): Promise<ActionResult> {
  try {
    await requireWrite("admin");
    const parsed = toolFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createTool(parsed.data);
    revalidatePath("/ferramentas");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setToolActiveAction(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await requireWrite("admin");
    await setToolActive(id, active);
    revalidatePath("/ferramentas");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function listProcessesAction(): Promise<ActionResult<ProcessDoc[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listProcesses() };
  } catch (error) {
    return fail(error);
  }
}

export async function createProcessAction(raw: unknown): Promise<ActionResult> {
  try {
    await requireWrite("admin");
    const parsed = processFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createProcess(parsed.data);
    revalidatePath("/processos");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateProcessAction(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  try {
    await requireWrite("admin");
    const parsed = processFormSchema.partial().safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await updateProcess(id, parsed.data);
    revalidatePath("/processos");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
