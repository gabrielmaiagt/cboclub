"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireAuth, requireWrite } from "@/lib/auth/guard";
import {
  decisionFormSchema,
  decisionResolveSchema,
  taskFormSchema,
  taskStatusSchema,
  taskUpdateSchema,
} from "@/lib/schemas/management";
import {
  changeTaskStatus,
  createDecision,
  createTask,
  getTaskById,
  listDecisions,
  listTasks,
  resolveDecision,
  softDeleteTask,
  updateTask,
} from "@/services/firestore/tasks.repo";
import type { Actor } from "@/services/firestore/offers.repo";
import { canWrite } from "@/lib/auth/permissions";
import type { Decision, Task, User } from "@/types/domain";

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
  revalidatePath("/tarefas");
  revalidatePath("/");
}

export async function listTasksAction(
  responsibleId?: string,
  offerId?: string
): Promise<ActionResult<Task[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listTasks({ responsibleId, offerId }) };
  } catch (error) {
    return fail(error);
  }
}

/** Qualquer nao-viewer cria tarefas. */
export async function createTaskAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    if (ctx.role === "viewer") {
      return { ok: false, error: "Seu papel não pode criar tarefas." };
    }
    const parsed = taskFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    await createTask(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Dono da tarefa, quem criou, ou admin — igual as rules. */
export async function updateTaskAction(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    if (ctx.role === "viewer") {
      return { ok: false, error: "Seu papel não pode editar tarefas." };
    }
    const existing = await getTaskById(id);
    if (!existing) return { ok: false, error: "Tarefa não encontrada." };
    const isOwnerOfTask =
      existing.responsibleId === ctx.uid || existing.createdBy === ctx.uid;
    if (!canWrite(ctx.role, "admin") && !isOwnerOfTask) {
      return { ok: false, error: "Você só edita as próprias tarefas." };
    }
    const parsed = taskUpdateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Dados inválidos." };
    await updateTask(id, parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function changeTaskStatusAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    if (ctx.role === "viewer") return { ok: false, error: "Sem permissão." };
    const parsed = taskStatusSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Status inválido." };
    const existing = await getTaskById(parsed.data.id);
    if (!existing) return { ok: false, error: "Tarefa não encontrada." };
    const isOwnerOfTask =
      existing.responsibleId === ctx.uid || existing.createdBy === ctx.uid;
    if (!canWrite(ctx.role, "admin") && !isOwnerOfTask) {
      return { ok: false, error: "Você só edita as próprias tarefas." };
    }
    await changeTaskStatus(parsed.data.id, parsed.data.status, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveTaskAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    if (ctx.role === "viewer") return { ok: false, error: "Sem permissão." };
    await softDeleteTask(id, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

// ── Decisoes ────────────────────────────────────────────────────────

export async function listDecisionsAction(
  offerId?: string,
  status?: string
): Promise<ActionResult<Decision[]>> {
  try {
    await requireAuth();
    return { ok: true, data: await listDecisions({ offerId, status }) };
  } catch (error) {
    return fail(error);
  }
}

export async function createDecisionAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("offers");
    const parsed = decisionFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createDecision(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function resolveDecisionAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("offers");
    const parsed = decisionResolveSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Descreva a resolução." };
    await resolveDecision(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
