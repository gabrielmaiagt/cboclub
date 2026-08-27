import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL, COUNTER_KEYS, SUB, DOC } from "@/lib/firebase/collections";
import { appendActivity } from "@/services/firestore/activity.repo";
import { nextCode } from "@/services/firestore/counters";
import {
  auditOnCreate,
  auditOnUpdate,
  readAudit,
  stripUndefined,
  tsToIso,
} from "@/services/firestore/converters";
import type { Actor } from "@/services/firestore/offers.repo";
import type { ChipFormOutput, ChipUpdateValues } from "@/lib/schemas/chip";
import { CHIP_STATUS_LABELS } from "@/lib/status";
import type { Chip, ChipEvent, ChipStatus } from "@/types/domain";

/**
 * Repositorio de chips (secoes 39-44 do produto).
 *
 * O numero real vive isolado em chips/{id}/secret/phone. Security Rules
 * protegem por documento, entao separar a subcollection e a unica forma
 * de esconder o numero de quem nao tem o papel certo. O documento
 * principal so guarda a mascara (ultimos 4 digitos).
 *
 * Secao 41: datas de ciclo (acquisitionDate, warmupStartDate, readyDate,
 * activationDate) sao carimbadas automaticamente na PRIMEIRA vez que o
 * chip passa por cada status.
 */

function mask(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.length >= 4 ? `****${digits.slice(-4)}` : "****";
}

function toChip(doc: FirebaseFirestore.DocumentSnapshot): Chip {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    maskedNumber: d.maskedNumber ?? null,
    operator: d.operator ?? null,
    status: d.status as ChipStatus,
    responsibleId: d.responsibleId ?? null,
    currentOfferId: d.currentOfferId ?? null,
    notes: d.notes ?? null,
    acquisitionDate: d.acquisitionDate ?? null,
    warmupStartDate: d.warmupStartDate ?? null,
    readyDate: d.readyDate ?? null,
    activationDate: d.activationDate ?? null,
    ...readAudit(d),
  };
}

export async function getChipById(id: string): Promise<Chip | null> {
  const snap = await adminDb().collection(COL.chips).doc(id).get();
  if (!snap.exists) return null;
  const chip = toChip(snap);
  return chip.deletedAt ? null : chip;
}

export async function listChips(
  options: { offerId?: string; status?: ChipStatus; limit?: number } = {}
): Promise<Chip[]> {
  let q: FirebaseFirestore.Query;
  if (options.offerId) {
    q = adminDb()
      .collection(COL.chips)
      .where("currentOfferId", "==", options.offerId)
      .where("deletedAt", "==", null);
  } else {
    q = adminDb().collection(COL.chips).where("deletedAt", "==", null);
  }
  const snap = await q.limit(options.limit ?? 500).get();
  let rows = snap.docs.map(toChip).sort((a, b) => a.code.localeCompare(b.code));
  if (options.status) rows = rows.filter((c) => c.status === options.status);
  return rows;
}

/** Capacidade operacional (secao 43) — contagem por status. */
export async function getChipCapacity(): Promise<
  Record<ChipStatus, number> & { total: number }
> {
  const chips = await listChips();
  const counts = { total: chips.length } as Record<ChipStatus, number> & {
    total: number;
  };
  for (const c of chips) counts[c.status] = (counts[c.status] ?? 0) + 1;
  return counts;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Datas de ciclo carimbadas na primeira passagem por cada status. */
function lifecycleStamps(
  status: ChipStatus,
  existing: Pick<
    Chip,
    "acquisitionDate" | "warmupStartDate" | "readyDate" | "activationDate"
  >
): Record<string, string> {
  const stamps: Record<string, string> = {};
  const today = todayIso();
  if (!existing.acquisitionDate) stamps.acquisitionDate = today;
  if (status === "aquecendo" && !existing.warmupStartDate)
    stamps.warmupStartDate = today;
  if (status === "pronto" && !existing.readyDate) stamps.readyDate = today;
  if (status === "ativo" && !existing.activationDate)
    stamps.activationDate = today;
  return stamps;
}

function chipEventPayload(
  type: ChipEvent["type"],
  description: string,
  offerId: string | null,
  actor: Actor
) {
  return {
    type,
    description,
    offerId,
    actorId: actor.uid,
    actorName: actor.name,
    createdAt: new Date(),
  };
}

export async function listChipEvents(chipId: string): Promise<ChipEvent[]> {
  const snap = await adminDb()
    .collection(COL.chips)
    .doc(chipId)
    .collection(SUB.chipEvents)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      chipId,
      type: d.type,
      description: d.description,
      offerId: d.offerId ?? null,
      actorId: d.actorId ?? null,
      actorName: d.actorName ?? null,
      createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
    };
  });
}

export async function createChip(
  input: ChipFormOutput,
  actor: Actor
): Promise<Chip> {
  const db = adminDb();
  const ref = db.collection(COL.chips).doc();
  const maskedNumber = mask(input.phoneNumber);

  await db.runTransaction(async (tx) => {
    const code = await nextCode(COUNTER_KEYS.chips, tx);
    const stamps = lifecycleStamps(input.status, {
      acquisitionDate: null,
      warmupStartDate: null,
      readyDate: null,
      activationDate: null,
    });

    tx.set(
      ref,
      stripUndefined({
        code,
        maskedNumber,
        operator: input.operator,
        status: input.status,
        responsibleId: input.responsibleId,
        currentOfferId: null,
        notes: input.notes,
        acquisitionDate: null,
        warmupStartDate: null,
        readyDate: null,
        activationDate: null,
        ...stamps,
        ...auditOnCreate(actor.uid),
      })
    );
    tx.set(ref.collection(SUB.chipSecret).doc(DOC.chipSecretPhone), {
      phoneNumber: input.phoneNumber,
      updatedAt: new Date(),
      updatedBy: actor.uid,
    });
    tx.set(
      ref.collection(SUB.chipEvents).doc(),
      chipEventPayload("compra", "Chip cadastrado", null, actor)
    );

    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "chip",
        entityId: ref.id,
        entityCode: code,
        offerId: null,
        action: "created",
        description: `${actor.name ?? "Alguém"} cadastrou o chip ${code}`,
      },
      db
    );
  });

  const created = await getChipById(ref.id);
  if (!created) throw new Error("Chip não encontrado após a criação.");
  return created;
}

export async function updateChip(
  id: string,
  patch: ChipUpdateValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.chips).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Chip não encontrado.");

  await ref.update(stripUndefined({ ...patch, ...auditOnUpdate(actor.uid) }));
}

/** Muda o status e carimba a data de ciclo correspondente (secao 41). */
export async function changeChipStatus(
  id: string,
  status: ChipStatus,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.chips).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Chip não encontrado.");
  const before = toChip(snap);
  if (before.status === status) return;

  const stamps = lifecycleStamps(status, before);
  const batch = db.batch();
  batch.update(ref, {
    status,
    ...stamps,
    ...auditOnUpdate(actor.uid),
  });
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "chip",
      entityId: id,
      entityCode: before.code,
      offerId: before.currentOfferId,
      action: "status_changed",
      field: "status",
      oldValue: before.status,
      newValue: status,
      description: `${actor.name ?? "Alguém"} mudou ${before.code} para ${CHIP_STATUS_LABELS[status]}`,
    },
    db
  );
  const eventType: ChipEvent["type"] =
    status === "aquecendo"
      ? "aquecimento_iniciado"
      : status === "pronto"
        ? "pronto"
        : status === "reserva"
          ? "reserva"
          : status === "indisponivel"
            ? "indisponivel"
            : status === "arquivado"
              ? "arquivado"
              : "nota";
  batch.set(
    ref.collection(SUB.chipEvents).doc(),
    chipEventPayload(
      eventType,
      `Status: ${CHIP_STATUS_LABELS[before.status]} -> ${CHIP_STATUS_LABELS[status]}`,
      before.currentOfferId,
      actor
    )
  );

  await batch.commit();
}

/** Vincula/desvincula o chip de uma oferta (secao 42), com historico. */
export async function setChipOffer(
  id: string,
  offerId: string | null,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.chips).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Chip não encontrado.");
  const before = toChip(snap);
  if (before.currentOfferId === offerId) return;

  const batch = db.batch();
  batch.update(ref, { currentOfferId: offerId, ...auditOnUpdate(actor.uid) });
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "chip",
      entityId: id,
      entityCode: before.code,
      offerId,
      action: "updated",
      field: "currentOfferId",
      description: offerId
        ? `${actor.name ?? "Alguém"} vinculou ${before.code} a uma oferta`
        : `${actor.name ?? "Alguém"} desvinculou ${before.code} da oferta`,
    },
    db
  );
  batch.set(
    ref.collection(SUB.chipEvents).doc(),
    chipEventPayload(
      offerId ? "vinculado_oferta" : "desvinculado_oferta",
      offerId ? "Vinculado a uma oferta" : "Desvinculado da oferta",
      offerId,
      actor
    )
  );

  await batch.commit();
}

/** Numero real — so quem tem READ_GROUPS.chipSecret. */
export async function getChipPhoneNumber(id: string): Promise<string | null> {
  const snap = await adminDb()
    .collection(COL.chips)
    .doc(id)
    .collection(SUB.chipSecret)
    .doc(DOC.chipSecretPhone)
    .get();
  return snap.exists ? ((snap.data()?.phoneNumber as string) ?? null) : null;
}
