import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL, COUNTER_KEYS, SUB } from "@/lib/firebase/collections";
import { countWords, estimateDurationSeconds } from "@/lib/metrics";
import type {
  ScriptFormOutput,
  ScriptMetaValues,
  ScriptVersionValues,
} from "@/lib/schemas/script";
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
import { getAppSettings } from "@/services/firestore/settings.repo";
import type { Actor } from "@/services/firestore/offers.repo";
import type {
  Script,
  ScriptStatus,
  ScriptVersionData,
} from "@/types/domain";

/**
 * Repositorio de copies.
 *
 * REGRA (§20): conteudo nunca e sobrescrito. Toda alteracao de
 * hook/body/cta cria a versao V(n+1) em `versions/`; o doc principal
 * guarda apenas o snapshot `current` para a listagem nao precisar ler a
 * subcollection. As Security Rules negam update/delete nas versoes.
 */

// ── Leitura ─────────────────────────────────────────────────────────

function toVersionData(d: FirebaseFirestore.DocumentData): ScriptVersionData {
  return {
    version: d.version,
    hook: d.hook ?? null,
    body: d.body ?? "",
    cta: d.cta ?? null,
    wordCount: d.wordCount ?? 0,
    estimatedDurationSeconds: d.estimatedDurationSeconds ?? 0,
    changeNote: d.changeNote ?? null,
    createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
    createdBy: d.createdBy ?? null,
  };
}

function toScript(doc: FirebaseFirestore.DocumentSnapshot): Script {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    offerId: d.offerId,
    angleId: d.angleId ?? null,
    title: d.title,
    status: d.status as ScriptStatus,
    currentVersion: d.currentVersion ?? 1,
    responsibleId: d.responsibleId ?? null,
    notes: d.notes ?? null,
    current: toVersionData(d.current ?? { version: 1 }),
    ...readAudit(d),
  };
}

export async function getScriptById(id: string): Promise<Script | null> {
  const snap = await adminDb().collection(COL.scripts).doc(id).get();
  if (!snap.exists) return null;
  const script = toScript(snap);
  return script.deletedAt ? null : script;
}

export async function getScriptByCode(code: string): Promise<Script | null> {
  const snap = await adminDb()
    .collection(COL.scripts)
    .where("code", "==", code.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const script = toScript(snap.docs[0]);
  return script.deletedAt ? null : script;
}

export async function listScripts(
  options: { offerId?: string; limit?: number } = {}
): Promise<Script[]> {
  let q: FirebaseFirestore.Query = adminDb()
    .collection(COL.scripts)
    .where("deletedAt", "==", null);

  if (options.offerId) {
    q = q.where("offerId", "==", options.offerId);
  }

  const snap = await q
    .orderBy("updatedAt", "desc")
    .limit(options.limit ?? 300)
    .get();
  return snap.docs.map(toScript);
}

/** Todas as versoes, da mais nova para a mais antiga. */
export async function listVersions(
  scriptId: string
): Promise<ScriptVersionData[]> {
  const snap = await adminDb()
    .collection(COL.scripts)
    .doc(scriptId)
    .collection(SUB.scriptVersions)
    .orderBy("version", "desc")
    .get();
  return snap.docs.map((doc) => toVersionData(doc.data()));
}

// ── Escrita ─────────────────────────────────────────────────────────

function buildVersionPayload(
  content: { hook: string | null; body: string; cta: string | null },
  version: number,
  changeNote: string | null,
  wpm: number,
  uid: string
) {
  const text = [content.hook, content.body, content.cta]
    .filter(Boolean)
    .join(" ");
  const wordCount = countWords(text);
  return {
    version,
    hook: content.hook,
    body: content.body,
    cta: content.cta,
    wordCount,
    estimatedDurationSeconds: estimateDurationSeconds(wordCount, wpm),
    changeNote,
    createdAt: new Date(),
    createdBy: uid,
  };
}

/**
 * Cria a copy com a V1 numa unica transacao:
 * codigo CP-000n + doc principal + versions/v1 + activity.
 */
export async function createScript(
  input: ScriptFormOutput,
  actor: Actor
): Promise<Script> {
  const db = adminDb();
  const ref = db.collection(COL.scripts).doc();
  // WPM lido fora da transacao: leituras precisam vir antes das escritas
  const { copyWordsPerMinute } = await getAppSettings();

  await db.runTransaction(async (tx) => {
    const code = await nextCode(COUNTER_KEYS.scripts, tx);

    const v1 = buildVersionPayload(
      { hook: input.hook, body: input.body, cta: input.cta },
      1,
      "Versão inicial",
      copyWordsPerMinute,
      actor.uid
    );

    tx.set(
      ref,
      stripUndefined({
        code,
        offerId: input.offerId,
        angleId: input.angleId,
        title: input.title,
        status: input.status,
        currentVersion: 1,
        responsibleId: input.responsibleId,
        notes: input.notes,
        current: v1,
        ...auditOnCreate(actor.uid),
      })
    );

    tx.set(ref.collection(SUB.scriptVersions).doc("v1"), v1);

    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "script",
        entityId: ref.id,
        entityCode: code,
        offerId: input.offerId,
        action: "created",
        description: `${actor.name ?? "Alguém"} criou a copy ${code} — ${input.title}`,
      },
      db
    );
  });

  const created = await getScriptById(ref.id);
  if (!created) throw new Error("Copy não encontrada após a criação.");
  return created;
}

/**
 * Adiciona V(n+1). A versao anterior permanece intocada; o snapshot
 * `current` e `currentVersion` avancam juntos, na mesma transacao.
 */
export async function addScriptVersion(
  input: ScriptVersionValues,
  actor: Actor
): Promise<{ version: number }> {
  const db = adminDb();
  const ref = db.collection(COL.scripts).doc(input.scriptId);
  const { copyWordsPerMinute } = await getAppSettings();

  const version = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Copy não encontrada.");
    const script = toScript(snap);

    const next = script.currentVersion + 1;
    const payload = buildVersionPayload(
      { hook: input.hook, body: input.body, cta: input.cta },
      next,
      input.changeNote,
      copyWordsPerMinute,
      actor.uid
    );

    tx.set(ref.collection(SUB.scriptVersions).doc(`v${next}`), payload);
    tx.update(ref, {
      current: payload,
      currentVersion: next,
      ...auditOnUpdate(actor.uid),
    });

    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "script",
        entityId: ref.id,
        entityCode: script.code,
        offerId: script.offerId,
        action: "updated",
        field: "version",
        oldValue: `V${script.currentVersion}`,
        newValue: `V${next}`,
        description: `${actor.name ?? "Alguém"} adicionou a V${next} à copy ${script.code}`,
      },
      db
    );

    return next;
  });

  return { version };
}

/** Metadados (titulo, status, angulo, responsavel, notas) — sem conteudo. */
export async function updateScriptMeta(
  id: string,
  patch: ScriptMetaValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.scripts).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Copy não encontrada.");
  const before = toScript(snap);

  const batch = db.batch();
  batch.update(ref, stripUndefined({ ...patch, ...auditOnUpdate(actor.uid) }));

  if (patch.status && patch.status !== before.status) {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "script",
        entityId: id,
        entityCode: before.code,
        offerId: before.offerId,
        action: "status_changed",
        field: "status",
        oldValue: before.status,
        newValue: patch.status,
        description: `${actor.name ?? "Alguém"} alterou ${before.code} de ${before.status} para ${patch.status}`,
      },
      db
    );
  } else {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "script",
        entityId: id,
        entityCode: before.code,
        offerId: before.offerId,
        action: "updated",
        description: `${actor.name ?? "Alguém"} editou a copy ${before.code}`,
      },
      db
    );
  }

  await batch.commit();
}

export async function softDeleteScript(id: string, actor: Actor): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.scripts).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Copy não encontrada.");
  const before = toScript(snap);

  const batch = db.batch();
  batch.update(ref, auditOnSoftDelete(actor.uid));
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "script",
      entityId: id,
      entityCode: before.code,
      offerId: before.offerId,
      action: "deleted",
      description: `${actor.name ?? "Alguém"} arquivou a copy ${before.code}`,
    },
    db
  );
  await batch.commit();
}
