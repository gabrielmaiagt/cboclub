import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL, COUNTER_KEYS } from "@/lib/firebase/collections";
import type {
  CreativeFormOutput,
  CreativeUpdateValues,
} from "@/lib/schemas/creative";
import { CREATIVE_STATUS_LABELS } from "@/lib/status";
import { appendActivity } from "@/services/firestore/activity.repo";
import { nextCode } from "@/services/firestore/counters";
import {
  auditOnCreate,
  auditOnSoftDelete,
  auditOnUpdate,
  readAudit,
  stripUndefined,
  tsToIso,
} from "@/services/firestore/converters";
import type { Actor } from "@/services/firestore/offers.repo";
import type { Creative, CreativeStatus } from "@/types/domain";

/**
 * Repositorio de criativos.
 *
 * Autorizacao NAO acontece aqui: o guard das server actions ja validou o
 * papel. Aqui e persistencia + trilha de atividade no mesmo batch.
 */

// ── Leitura ─────────────────────────────────────────────────────────

function toCreative(doc: FirebaseFirestore.DocumentSnapshot): Creative {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    offerId: d.offerId,
    angleId: d.angleId ?? null,
    scriptId: d.scriptId ?? null,
    scriptVersion: d.scriptVersion ?? null,
    title: d.title,
    hook: d.hook ?? null,
    format: d.format ?? null,
    platform: d.platform ?? "meta",
    durationSeconds: d.durationSeconds ?? null,
    editorId: d.editorId ?? null,
    responsibleId: d.responsibleId ?? null,
    status: d.status as CreativeStatus,
    storagePath: d.storagePath ?? null,
    thumbnailPath: d.thumbnailPath ?? null,
    sourceUrl: d.sourceUrl ?? null,
    inspirationUrl: d.inspirationUrl ?? null,
    tags: d.tags ?? [],
    notes: d.notes ?? null,
    editedAt: tsToIso(d.editedAt),
    approvedAt: tsToIso(d.approvedAt),
    launchedAt: tsToIso(d.launchedAt),
    ...readAudit(d),
  };
}

export async function getCreativeById(id: string): Promise<Creative | null> {
  const snap = await adminDb().collection(COL.creatives).doc(id).get();
  if (!snap.exists) return null;
  const creative = toCreative(snap);
  return creative.deletedAt ? null : creative;
}

export async function getCreativeByCode(code: string): Promise<Creative | null> {
  const snap = await adminDb()
    .collection(COL.creatives)
    .where("code", "==", code.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const creative = toCreative(snap.docs[0]);
  return creative.deletedAt ? null : creative;
}

export async function listCreatives(
  options: { offerId?: string; limit?: number } = {}
): Promise<Creative[]> {
  let q: FirebaseFirestore.Query;

  if (options.offerId) {
    q = adminDb()
      .collection(COL.creatives)
      .where("offerId", "==", options.offerId)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc");
  } else {
    q = adminDb()
      .collection(COL.creatives)
      .where("deletedAt", "==", null)
      .orderBy("updatedAt", "desc");
  }

  const snap = await q.limit(options.limit ?? 500).get();
  return snap.docs.map(toCreative);
}

// ── Escrita ─────────────────────────────────────────────────────────

/** Campos do formulario que entram direto no documento. */
function docFields(input: CreativeFormOutput) {
  return {
    offerId: input.offerId,
    angleId: input.angleId,
    scriptId: input.scriptId,
    scriptVersion: input.scriptVersion,
    title: input.title,
    hook: input.hook,
    format: input.format,
    platform: input.platform,
    durationSeconds: input.durationSeconds,
    editorId: input.editorId,
    responsibleId: input.responsibleId,
    status: input.status,
    storagePath: input.storagePath,
    thumbnailPath: input.thumbnailPath,
    sourceUrl: input.sourceUrl,
    inspirationUrl: input.inspirationUrl,
    tags: input.tags,
    notes: input.notes,
  };
}

/**
 * Marcos do ciclo de vida (§14): carimbados na PRIMEIRA passagem por
 * cada status, sem sobrescrever se o criativo voltar de etapa.
 */
function lifecycleStamps(
  status: CreativeStatus,
  existing: Pick<Creative, "editedAt" | "approvedAt" | "launchedAt">
): Record<string, Date> {
  const stamps: Record<string, Date> = {};
  const now = new Date();
  if (status === "revisao" && !existing.editedAt) stamps.editedAt = now;
  if (status === "aprovado" && !existing.approvedAt) stamps.approvedAt = now;
  if (status === "testando" && !existing.launchedAt) stamps.launchedAt = now;
  return stamps;
}

export async function createCreative(
  input: CreativeFormOutput,
  actor: Actor
): Promise<Creative> {
  const db = adminDb();
  const ref = db.collection(COL.creatives).doc();

  // Quick capture (§7): titulo e opcional — herda o titulo da copy
  // vinculada, senao ganha um placeholder renomeavel depois.
  let title = input.title;
  if (!title && input.scriptId) {
    const scriptSnap = await db
      .collection(COL.scripts)
      .doc(input.scriptId)
      .get();
    title = scriptSnap.exists ? (scriptSnap.data()?.title ?? null) : null;
  }
  title = title || "Sem título";

  await db.runTransaction(async (tx) => {
    const code = await nextCode(COUNTER_KEYS.creatives, tx);

    tx.set(
      ref,
      stripUndefined({
        code,
        ...docFields(input),
        title,
        editedAt: null,
        approvedAt: null,
        launchedAt: null,
        ...lifecycleStamps(input.status, {
          editedAt: null,
          approvedAt: null,
          launchedAt: null,
        }),
        ...auditOnCreate(actor.uid),
      })
    );

    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "creative",
        entityId: ref.id,
        entityCode: code,
        offerId: input.offerId,
        action: "created",
        description: `${actor.name ?? "Alguém"} criou o criativo ${code} — ${title}`,
      },
      db
    );
  });

  const created = await getCreativeById(ref.id);
  if (!created) throw new Error("Criativo não encontrado após a criação.");
  return created;
}

export async function updateCreative(
  id: string,
  patch: CreativeUpdateValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.creatives).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Criativo não encontrado.");
  const before = toCreative(snap);

  const batch = db.batch();
  const stamps = patch.status ? lifecycleStamps(patch.status, before) : {};
  // Titulo nulo em update significa "nao mexer" — nunca apagar o existente
  const { title: patchTitle, ...rest } = patch;
  batch.update(
    ref,
    stripUndefined({
      ...rest,
      ...(patchTitle ? { title: patchTitle } : {}),
      ...stamps,
      ...auditOnUpdate(actor.uid),
    })
  );

  if (patch.status && patch.status !== before.status) {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "creative",
        entityId: id,
        entityCode: before.code,
        offerId: before.offerId,
        action: "status_changed",
        field: "status",
        oldValue: before.status,
        newValue: patch.status,
        description: `${actor.name ?? "Alguém"} moveu ${before.code} de ${
          CREATIVE_STATUS_LABELS[before.status]
        } para ${CREATIVE_STATUS_LABELS[patch.status]}`,
      },
      db
    );
  } else {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "creative",
        entityId: id,
        entityCode: before.code,
        offerId: before.offerId,
        action: "updated",
        description: `${actor.name ?? "Alguém"} editou o criativo ${before.code}`,
      },
      db
    );
  }

  await batch.commit();
}

export async function changeCreativeStatus(
  id: string,
  status: CreativeStatus,
  actor: Actor
): Promise<void> {
  await updateCreative(id, { status }, actor);
}

export async function softDeleteCreative(
  id: string,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.creatives).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Criativo não encontrado.");
  const before = toCreative(snap);

  const batch = db.batch();
  batch.update(ref, auditOnSoftDelete(actor.uid));
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "creative",
      entityId: id,
      entityCode: before.code,
      offerId: before.offerId,
      action: "deleted",
      description: `${actor.name ?? "Alguém"} arquivou o criativo ${before.code}`,
    },
    db
  );
  await batch.commit();
}
