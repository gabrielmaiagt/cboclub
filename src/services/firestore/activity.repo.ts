import "server-only";

import {
  FieldValue,
  Transaction,
  type Firestore,
  type WriteBatch,
} from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import { tsToIso } from "@/services/firestore/converters";
import type { ActivityEntry } from "@/types/domain";

/**
 * Trilha de auditoria.
 *
 * O cliente NUNCA escreve aqui — firestore.rules nega create, update e
 * delete para todo mundo. As entradas nascem exclusivamente do servidor,
 * no mesmo writeBatch da mutacao que as originou, de modo que log e
 * alteracao entram juntos ou nao entram.
 */

export interface ActivityInput {
  actorId: string;
  actorName: string | null;
  entityType: string;
  entityId: string;
  entityCode?: string | null;
  offerId?: string | null;
  action: ActivityEntry["action"];
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  description: string;
}

/**
 * Anexa a entrada de log a um batch ou transacao ja em andamento.
 *
 * Recebe o writer em vez de escrever sozinho justamente para que o log
 * compartilhe a atomicidade da mutacao: se a alteracao falhar, o log
 * tambem nao entra.
 */
export function appendActivity(
  writer: WriteBatch | Transaction,
  input: ActivityInput,
  db: Firestore = adminDb()
): void {
  const ref = db.collection(COL.activity).doc();
  const payload = {
    actorId: input.actorId,
    actorName: input.actorName ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    entityCode: input.entityCode ?? null,
    offerId: input.offerId ?? null,
    action: input.action,
    field: input.field ?? null,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    description: input.description,
    createdAt: FieldValue.serverTimestamp(),
  };

  // As assinaturas de set() de WriteBatch e Transaction diferem o
  // suficiente para a uniao nao ser chamavel; o narrowing resolve.
  if (writer instanceof Transaction) {
    writer.set(ref, payload);
  } else {
    writer.set(ref, payload);
  }
}

function toEntry(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): ActivityEntry {
  const d = doc.data();
  return {
    id: doc.id,
    actorId: d.actorId ?? null,
    actorName: d.actorName ?? null,
    entityType: d.entityType,
    entityId: d.entityId,
    entityCode: d.entityCode ?? null,
    offerId: d.offerId ?? null,
    action: d.action,
    field: d.field ?? null,
    oldValue: d.oldValue ?? null,
    newValue: d.newValue ?? null,
    description: d.description ?? "",
    createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
  };
}

/** Timeline de uma oferta — alimenta a aba Historico. */
export async function listActivityByOffer(
  offerId: string,
  limit = 50
): Promise<ActivityEntry[]> {
  const snap = await adminDb()
    .collection(COL.activity)
    .where("offerId", "==", offerId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(toEntry);
}

/** Feed global — alimenta /atividade e o bloco do dashboard. */
export async function listRecentActivity(limit = 25): Promise<ActivityEntry[]> {
  const snap = await adminDb()
    .collection(COL.activity)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(toEntry);
}

/** Historico de uma entidade especifica. */
export async function listActivityByEntity(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<ActivityEntry[]> {
  const snap = await adminDb()
    .collection(COL.activity)
    .where("entityType", "==", entityType)
    .where("entityId", "==", entityId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(toEntry);
}
