import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import { stripUndefined, tsToIso } from "@/services/firestore/converters";
import type { ProcessFormOutput, ToolFormOutput } from "@/lib/schemas/management";
import type { ProcessDoc, Tool } from "@/types/domain";

/** Ferramentas (secao 50) e Processos (secao 51 — nunca "SOPs" na UI). */

function toTool(doc: FirebaseFirestore.DocumentSnapshot): Tool {
  const d = doc.data()!;
  return {
    id: doc.id,
    name: d.name,
    category: d.category,
    url: d.url ?? null,
    monthlyCost: d.monthlyCost ?? 0,
    renewalDate: d.renewalDate ?? null,
    responsibleId: d.responsibleId ?? null,
    active: d.active !== false,
    createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
    updatedAt: tsToIso(d.updatedAt) ?? new Date().toISOString(),
  };
}

export async function listTools(): Promise<Tool[]> {
  const snap = await adminDb().collection(COL.tools).orderBy("name").get();
  return snap.docs.map(toTool);
}

export async function createTool(input: ToolFormOutput): Promise<Tool> {
  const db = adminDb();
  const ref = db.collection(COL.tools).doc();
  await ref.set(
    stripUndefined({
      name: input.name,
      category: input.category,
      url: input.url,
      monthlyCost: input.monthlyCost,
      renewalDate: input.renewalDate,
      responsibleId: input.responsibleId,
      active: input.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
  const snap = await ref.get();
  return toTool(snap);
}

export async function setToolActive(id: string, active: boolean): Promise<void> {
  await adminDb().collection(COL.tools).doc(id).update({
    active,
    updatedAt: new Date(),
  });
}

function toProcess(doc: FirebaseFirestore.DocumentSnapshot): ProcessDoc {
  const d = doc.data()!;
  return {
    id: doc.id,
    title: d.title,
    category: d.category,
    content: d.content ?? "",
    active: d.active !== false,
    createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
    updatedAt: tsToIso(d.updatedAt) ?? new Date().toISOString(),
  };
}

export async function listProcesses(): Promise<ProcessDoc[]> {
  const snap = await adminDb().collection(COL.sops).orderBy("title").get();
  return snap.docs.map(toProcess);
}

export async function getProcessById(id: string): Promise<ProcessDoc | null> {
  const snap = await adminDb().collection(COL.sops).doc(id).get();
  return snap.exists ? toProcess(snap) : null;
}

export async function createProcess(
  input: ProcessFormOutput
): Promise<ProcessDoc> {
  const db = adminDb();
  const ref = db.collection(COL.sops).doc();
  await ref.set({
    title: input.title,
    category: input.category,
    content: input.content,
    active: input.active,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const snap = await ref.get();
  return toProcess(snap);
}

export async function updateProcess(
  id: string,
  patch: Partial<ProcessFormOutput>
): Promise<void> {
  await adminDb()
    .collection(COL.sops)
    .doc(id)
    .update(stripUndefined({ ...patch, updatedAt: new Date() }));
}
