import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL, COUNTER_KEYS } from "@/lib/firebase/collections";
import type {
  ReferenceQuickValues,
  ReferenceUpdateValues,
} from "@/lib/schemas/reference";
import { REFERENCE_STATUS_LABELS } from "@/lib/status";
import { appendActivity } from "@/services/firestore/activity.repo";
import { nextCode } from "@/services/firestore/counters";
import {
  auditOnCreate,
  auditOnSoftDelete,
  auditOnUpdate,
  readAudit,
  stripUndefined,
} from "@/services/firestore/converters";
import type { Actor } from "@/services/firestore/offers.repo";
import { createScript } from "@/services/firestore/scripts.repo";
import type {
  CreativeReference,
  ReferenceStatus,
  Script,
} from "@/types/domain";

/**
 * Swipe file (§8): criativos EXTERNOS salvos para modelar.
 * Nunca se misturam com `creatives`. A transcricao original nunca e
 * sobrescrita pela nossa versao — a modelagem gera um Script novo.
 */

function toReference(
  doc: FirebaseFirestore.DocumentSnapshot
): CreativeReference {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    url: d.url ?? null,
    storagePath: d.storagePath ?? null,
    transcription: d.transcription ?? null,
    whySaved: d.whySaved ?? null,
    analysis: d.analysis ?? null,
    miningItemId: d.miningItemId ?? null,
    status: (d.status ?? "salvo") as ReferenceStatus,
    advertiser: d.advertiser ?? null,
    format: d.format ?? null,
    source: d.source ?? null,
    notes: d.notes ?? null,
    ...readAudit(d),
  };
}

export async function getReferenceById(
  id: string
): Promise<CreativeReference | null> {
  const snap = await adminDb().collection(COL.creativeReferences).doc(id).get();
  if (!snap.exists) return null;
  const ref = toReference(snap);
  return ref.deletedAt ? null : ref;
}

export async function getReferenceByCode(
  code: string
): Promise<CreativeReference | null> {
  const snap = await adminDb()
    .collection(COL.creativeReferences)
    .where("code", "==", code.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const ref = toReference(snap.docs[0]);
  return ref.deletedAt ? null : ref;
}

export async function listReferences(
  options: { miningItemId?: string; limit?: number } = {}
): Promise<CreativeReference[]> {
  let q: FirebaseFirestore.Query;
  if (options.miningItemId) {
    q = adminDb()
      .collection(COL.creativeReferences)
      .where("miningItemId", "==", options.miningItemId)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc");
  } else {
    q = adminDb()
      .collection(COL.creativeReferences)
      .where("deletedAt", "==", null)
      .orderBy("updatedAt", "desc");
  }
  const snap = await q.limit(options.limit ?? 400).get();
  return snap.docs.map(toReference);
}

/**
 * Quick capture (§9): link + por que salvei. Segundos, nao minutos.
 */
export async function createReference(
  input: ReferenceQuickValues,
  actor: Actor
): Promise<CreativeReference> {
  const db = adminDb();
  const ref = db.collection(COL.creativeReferences).doc();

  await db.runTransaction(async (tx) => {
    const code = await nextCode(COUNTER_KEYS.references, tx);

    tx.set(
      ref,
      stripUndefined({
        code,
        url: input.url,
        storagePath: input.storagePath,
        transcription: input.transcription,
        whySaved: input.whySaved,
        analysis: null,
        miningItemId: input.miningItemId,
        status: input.status,
        advertiser: null,
        format: null,
        source: null,
        notes: null,
        ...auditOnCreate(actor.uid),
      })
    );

    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "reference",
        entityId: ref.id,
        entityCode: code,
        offerId: null,
        action: "created",
        description: `${actor.name ?? "Alguém"} salvou a referência ${code}`,
      },
      db
    );
  });

  const created = await getReferenceById(ref.id);
  if (!created) throw new Error("Referência não encontrada após salvar.");
  return created;
}

export async function updateReference(
  id: string,
  patch: ReferenceUpdateValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.creativeReferences).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Referência não encontrada.");
  const before = toReference(snap);

  const batch = db.batch();
  batch.update(ref, stripUndefined({ ...patch, ...auditOnUpdate(actor.uid) }));

  if (patch.status && patch.status !== before.status) {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "reference",
        entityId: id,
        entityCode: before.code,
        offerId: null,
        action: "status_changed",
        field: "status",
        oldValue: before.status,
        newValue: patch.status,
        description: `${actor.name ?? "Alguém"} marcou ${before.code} como ${
          REFERENCE_STATUS_LABELS[patch.status]
        }`,
      },
      db
    );
  } else {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "reference",
        entityId: id,
        entityCode: before.code,
        offerId: null,
        action: "updated",
        description: `${actor.name ?? "Alguém"} editou a referência ${before.code}`,
      },
      db
    );
  }

  await batch.commit();
}

export async function softDeleteReference(
  id: string,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.creativeReferences).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Referência não encontrada.");
  const before = toReference(snap);

  const batch = db.batch();
  batch.update(ref, auditOnSoftDelete(actor.uid));
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "reference",
      entityId: id,
      entityCode: before.code,
      offerId: null,
      action: "deleted",
      description: `${actor.name ?? "Alguém"} arquivou a referência ${before.code}`,
    },
    db
  );
  await batch.commit();
}

/**
 * "Criar modelagem" (§12): gera uma copy interna RASCUNHO a partir da
 * referencia, preservando a relacao REF -> CP. A transcricao original e
 * usada como ponto de partida do corpo — copiada para um documento novo,
 * o original permanece intocado.
 */
export async function createModelagem(
  referenceId: string,
  offerId: string,
  actor: Actor
): Promise<Script> {
  const reference = await getReferenceById(referenceId);
  if (!reference) throw new Error("Referência não encontrada.");

  const script = await createScript(
    {
      offerId,
      angleId: null,
      title: `Modelagem de ${reference.code}`,
      status: "rascunho",
      responsibleId: actor.uid ? null : null,
      notes: reference.whySaved
        ? `Por que salvamos: ${reference.whySaved}`
        : null,
      suggestedFormat: reference.format,
      editingInstructions: null,
      referenceLinks: reference.url,
      deadline: null,
      sourceReferenceId: reference.id,
      hook: null,
      body: reference.transcription ?? "",
      cta: null,
    },
    actor
  );

  // Marca a referencia como modelada (se ainda nao for)
  if (reference.status !== "modelado") {
    await updateReference(referenceId, { status: "modelado" }, actor);
  }

  return script;
}

/** Copies internas geradas a partir desta referencia (§12). */
export async function listModelagens(referenceId: string): Promise<Script[]> {
  // Igualdade em um campo usa o indice automatico; deletedAt em memoria
  const { toScriptPublic } = await import("@/services/firestore/scripts.repo");
  const snap = await adminDb()
    .collection(COL.scripts)
    .where("sourceReferenceId", "==", referenceId)
    .get();
  return snap.docs.map(toScriptPublic).filter((s) => !s.deletedAt);
}
