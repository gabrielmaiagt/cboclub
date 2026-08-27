import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL, COUNTER_KEYS } from "@/lib/firebase/collections";
import { appendActivity } from "@/services/firestore/activity.repo";
import { nextCode } from "@/services/firestore/counters";
import {
  auditOnCreate,
  auditOnUpdate,
  readAudit,
  stripUndefined,
} from "@/services/firestore/converters";
import type { Actor } from "@/services/firestore/offers.repo";
import type {
  ExperimentFormOutput,
  ExperimentUpdateValues,
} from "@/lib/schemas/experiment";
import type { Experiment, ExperimentStatus } from "@/types/domain";

/**
 * Repositorio de testes (§23-§25).
 *
 * A regra do §24 (nao concluir sem resultado+conclusao+proximaAcao) e
 * validada no Zod (lib/schemas/experiment.ts) ANTES de chegar aqui, e de
 * novo nas Security Rules para quem escreve direto do cliente.
 */

function toExperiment(doc: FirebaseFirestore.DocumentSnapshot): Experiment {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    offerId: d.offerId,
    name: d.name,
    hypothesis: d.hypothesis,
    variable: d.variable,
    status: d.status as ExperimentStatus,
    responsibleId: d.responsibleId ?? null,
    startDate: d.startDate ?? null,
    endDate: d.endDate ?? null,
    spend: d.spend ?? 0,
    leads: d.leads ?? 0,
    sales: d.sales ?? 0,
    revenue: d.revenue ?? 0,
    result: d.result ?? null,
    conclusion: d.conclusion ?? null,
    nextAction: d.nextAction ?? null,
    ...readAudit(d),
  };
}

export async function getExperimentById(id: string): Promise<Experiment | null> {
  const snap = await adminDb().collection(COL.experiments).doc(id).get();
  if (!snap.exists) return null;
  const exp = toExperiment(snap);
  return exp.deletedAt ? null : exp;
}

export async function listExperiments(
  options: { offerId?: string; status?: ExperimentStatus; limit?: number } = {}
): Promise<Experiment[]> {
  let q: FirebaseFirestore.Query;
  if (options.offerId) {
    q = adminDb()
      .collection(COL.experiments)
      .where("offerId", "==", options.offerId)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc");
  } else {
    q = adminDb()
      .collection(COL.experiments)
      .where("deletedAt", "==", null)
      .orderBy("createdAt", "desc");
  }
  const snap = await q.limit(options.limit ?? 400).get();
  let rows = snap.docs.map(toExperiment);
  if (options.status) rows = rows.filter((e) => e.status === options.status);
  return rows;
}

export async function createExperiment(
  input: ExperimentFormOutput,
  actor: Actor
): Promise<Experiment> {
  const db = adminDb();
  const ref = db.collection(COL.experiments).doc();

  await db.runTransaction(async (tx) => {
    const code = await nextCode(COUNTER_KEYS.experiments, tx);
    tx.set(
      ref,
      stripUndefined({
        code,
        offerId: input.offerId,
        name: input.name,
        hypothesis: input.hypothesis,
        variable: input.variable,
        status: input.status,
        responsibleId: input.responsibleId,
        startDate: input.startDate,
        endDate: input.endDate,
        spend: input.spend,
        leads: input.leads,
        sales: input.sales,
        revenue: input.revenue,
        result: input.result,
        conclusion: input.conclusion,
        nextAction: input.nextAction,
        ...auditOnCreate(actor.uid),
      })
    );
    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "experiment",
        entityId: ref.id,
        entityCode: code,
        offerId: input.offerId,
        action: "created",
        description: `${actor.name ?? "Alguém"} criou o teste ${code} — ${input.name}`,
      },
      db
    );
  });

  const created = await getExperimentById(ref.id);
  if (!created) throw new Error("Teste não encontrado após a criação.");
  return created;
}

export async function updateExperiment(
  id: string,
  patch: ExperimentUpdateValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.experiments).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Teste não encontrado.");
  const before = toExperiment(snap);

  const batch = db.batch();
  batch.update(ref, stripUndefined({ ...patch, ...auditOnUpdate(actor.uid) }));

  const concluding = patch.status === "concluido" && before.status !== "concluido";
  if (patch.status && patch.status !== before.status) {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "experiment",
        entityId: id,
        entityCode: before.code,
        offerId: before.offerId,
        action: "status_changed",
        field: "status",
        oldValue: before.status,
        newValue: patch.status,
        description: concluding
          ? `${actor.name ?? "Alguém"} concluiu o teste ${before.code}: ${patch.conclusion ?? before.conclusion ?? ""}`
          : `${actor.name ?? "Alguém"} alterou ${before.code} para ${patch.status}`,
      },
      db
    );
  } else {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "experiment",
        entityId: id,
        entityCode: before.code,
        offerId: before.offerId,
        action: "updated",
        description: `${actor.name ?? "Alguém"} editou o teste ${before.code}`,
      },
      db
    );
  }

  await batch.commit();
}
