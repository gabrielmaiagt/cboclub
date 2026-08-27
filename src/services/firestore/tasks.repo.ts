import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import { appendActivity } from "@/services/firestore/activity.repo";
import {
  auditOnCreate,
  auditOnSoftDelete,
  auditOnUpdate,
  readAudit,
  stripUndefined,
  tsToIso,
} from "@/services/firestore/converters";
import type { Actor } from "@/services/firestore/offers.repo";
import type { TaskFormOutput, TaskUpdateValues } from "@/lib/schemas/management";
import type { Task, TaskStatus } from "@/types/domain";

/** Tarefas (secao 45): campos minimos, nada de Jira. */

function toTask(doc: FirebaseFirestore.DocumentSnapshot): Task {
  const d = doc.data()!;
  return {
    id: doc.id,
    title: d.title,
    description: d.description ?? null,
    status: d.status as TaskStatus,
    priority: d.priority ?? "media",
    responsibleId: d.responsibleId ?? null,
    deadline: d.deadline ?? null,
    offerId: d.offerId ?? null,
    creativeId: d.creativeId ?? null,
    decisionId: d.decisionId ?? null,
    completedAt: tsToIso(d.completedAt),
    ...readAudit(d),
  };
}

export async function listTasks(
  options: { responsibleId?: string; offerId?: string; limit?: number } = {}
): Promise<Task[]> {
  let q: FirebaseFirestore.Query = adminDb()
    .collection(COL.tasks)
    .where("deletedAt", "==", null);
  if (options.responsibleId)
    q = q.where("responsibleId", "==", options.responsibleId);
  if (options.offerId) q = q.where("offerId", "==", options.offerId);
  const snap = await q.limit(options.limit ?? 500).get();
  return snap.docs.map(toTask);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const snap = await adminDb().collection(COL.tasks).doc(id).get();
  if (!snap.exists) return null;
  const task = toTask(snap);
  return task.deletedAt ? null : task;
}

export async function createTask(
  input: TaskFormOutput,
  actor: Actor
): Promise<Task> {
  const db = adminDb();
  const ref = db.collection(COL.tasks).doc();
  await ref.set(
    stripUndefined({
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      responsibleId: input.responsibleId,
      deadline: input.deadline,
      offerId: input.offerId,
      creativeId: input.creativeId,
      decisionId: input.decisionId,
      completedAt: null,
      ...auditOnCreate(actor.uid),
    })
  );
  const snap = await ref.get();
  return toTask(snap);
}

export async function updateTask(
  id: string,
  patch: TaskUpdateValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.tasks).doc(id);
  const completedAt =
    patch.status === "concluido"
      ? new Date().toISOString()
      : patch.status
        ? null
        : undefined;
  await ref.update(
    stripUndefined({
      ...patch,
      ...(completedAt !== undefined ? { completedAt } : {}),
      ...auditOnUpdate(actor.uid),
    })
  );
}

export async function changeTaskStatus(
  id: string,
  status: TaskStatus,
  actor: Actor
): Promise<void> {
  await updateTask(id, { status }, actor);
}

export async function softDeleteTask(id: string, actor: Actor): Promise<void> {
  await adminDb()
    .collection(COL.tasks)
    .doc(id)
    .update(auditOnSoftDelete(actor.uid));
}

// ── Decisoes ────────────────────────────────────────────────────────

import type { Decision } from "@/types/domain";
import { z } from "zod";
import type { DecisionFormOutput, decisionResolveSchema } from "@/lib/schemas/management";
type DecisionResolveInput = z.output<typeof decisionResolveSchema>;

function toDecision(doc: FirebaseFirestore.DocumentSnapshot): Decision {
  const d = doc.data()!;
  return {
    id: doc.id,
    title: d.title,
    description: d.description ?? null,
    priority: d.priority ?? "media",
    type: d.type ?? "operacional",
    status: d.status ?? "aberta",
    responsibleId: d.responsibleId ?? null,
    offerId: d.offerId ?? null,
    resolution: d.resolution ?? null,
    createdAt: d.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    resolvedAt: d.resolvedAt?.toDate?.()?.toISOString() ?? null,
  };
}

export async function listDecisions(
  options: { offerId?: string; status?: string; limit?: number } = {}
): Promise<Decision[]> {
  let q: FirebaseFirestore.Query = adminDb().collection(COL.decisions);
  if (options.offerId) q = q.where("offerId", "==", options.offerId);
  const snap = await q.limit(options.limit ?? 300).get();
  let rows = snap.docs.map(toDecision);
  if (options.status) rows = rows.filter((d) => d.status === options.status);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createDecision(
  input: DecisionFormOutput,
  actor: Actor
): Promise<Decision> {
  const db = adminDb();
  const ref = db.collection(COL.decisions).doc();
  await ref.set(
    stripUndefined({
      title: input.title,
      description: input.description,
      priority: input.priority,
      type: input.type,
      status: "aberta",
      responsibleId: input.responsibleId,
      offerId: input.offerId,
      resolution: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
  void actor;
  const snap = await ref.get();
  return toDecision(snap);
}

export async function resolveDecision(
  input: DecisionResolveInput,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.decisions).doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Decisão não encontrada.");
  const before = toDecision(snap);

  const batch = db.batch();
  batch.update(ref, {
    status: "resolvida",
    resolution: input.resolution,
    resolvedAt: new Date(),
    updatedAt: new Date(),
  });
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "decision",
      entityId: input.id,
      entityCode: null,
      offerId: before.offerId,
      action: "status_changed",
      field: "status",
      oldValue: before.status,
      newValue: "resolvida",
      description: `${actor.name ?? "Alguém"} resolveu: ${before.title}`,
    },
    db
  );
  await batch.commit();
}
