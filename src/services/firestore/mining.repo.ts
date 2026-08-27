import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL, COUNTER_KEYS } from "@/lib/firebase/collections";
import { appendActivity } from "@/services/firestore/activity.repo";
import { nextCode } from "@/services/firestore/counters";
import {
  auditOnCreate,
  auditOnSoftDelete,
  auditOnUpdate,
  readAudit,
  stripUndefined,
} from "@/services/firestore/converters";
import { createOffer, type Actor } from "@/services/firestore/offers.repo";
import type {
  MiningFormOutput,
  MiningUpdateValues,
} from "@/lib/schemas/mining";
import { MINING_STATUS_LABELS } from "@/lib/status";
import type { MiningItem, MiningStatus, Offer } from "@/types/domain";

/**
 * Mineracao (secoes 17-19): banco de ofertas de terceiros para estudar
 * ou modelar. Ativo EXTERNO — nunca se mistura com `offers` (nossa
 * operacao). "Transformar em oferta" cria uma Offer de verdade
 * preservando o vinculo `miningItemId`.
 */

function toMiningItem(doc: FirebaseFirestore.DocumentSnapshot): MiningItem {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    name: d.name,
    url: d.url ?? null,
    whyInteresting: d.whyInteresting ?? null,
    status: (d.status ?? "salva") as MiningStatus,
    niche: d.niche ?? null,
    country: d.country ?? null,
    targetAudience: d.targetAudience ?? null,
    promise: d.promise ?? null,
    mechanism: d.mechanism ?? null,
    price: d.price ?? null,
    advertiser: d.advertiser ?? null,
    score: d.score ?? null,
    notes: d.notes ?? null,
    convertedOfferId: d.convertedOfferId ?? null,
    ...readAudit(d),
  };
}

export async function listMiningItems(limit = 300): Promise<MiningItem[]> {
  const snap = await adminDb()
    .collection(COL.miningItems)
    .where("deletedAt", "==", null)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(toMiningItem);
}

export async function getMiningItemById(
  id: string
): Promise<MiningItem | null> {
  const snap = await adminDb().collection(COL.miningItems).doc(id).get();
  if (!snap.exists) return null;
  const item = toMiningItem(snap);
  return item.deletedAt ? null : item;
}

export async function getMiningItemByCode(
  code: string
): Promise<MiningItem | null> {
  const snap = await adminDb()
    .collection(COL.miningItems)
    .where("code", "==", code.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const item = toMiningItem(snap.docs[0]);
  return item.deletedAt ? null : item;
}

export async function createMiningItem(
  input: MiningFormOutput,
  actor: Actor
): Promise<MiningItem> {
  const db = adminDb();
  const ref = db.collection(COL.miningItems).doc();

  await db.runTransaction(async (tx) => {
    const code = await nextCode(COUNTER_KEYS.mining, tx);
    tx.set(
      ref,
      stripUndefined({
        code,
        name: input.name,
        url: input.url,
        whyInteresting: input.whyInteresting,
        status: input.status,
        niche: null,
        country: null,
        targetAudience: null,
        promise: null,
        mechanism: null,
        price: null,
        advertiser: null,
        score: null,
        notes: null,
        convertedOfferId: null,
        ...auditOnCreate(actor.uid),
      })
    );
    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "mining",
        entityId: ref.id,
        entityCode: code,
        offerId: null,
        action: "created",
        description: `${actor.name ?? "Alguém"} salvou a oferta minerada ${code} — ${input.name}`,
      },
      db
    );
  });

  const created = await getMiningItemById(ref.id);
  if (!created) throw new Error("Oferta minerada não encontrada após salvar.");
  return created;
}

export async function updateMiningItem(
  id: string,
  patch: MiningUpdateValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.miningItems).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Oferta minerada não encontrada.");
  const before = toMiningItem(snap);

  const batch = db.batch();
  batch.update(ref, stripUndefined({ ...patch, ...auditOnUpdate(actor.uid) }));

  if (patch.status && patch.status !== before.status) {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "mining",
        entityId: id,
        entityCode: before.code,
        offerId: null,
        action: "status_changed",
        field: "status",
        oldValue: before.status,
        newValue: patch.status,
        description: `${actor.name ?? "Alguém"} mudou ${before.code} para ${MINING_STATUS_LABELS[patch.status]}`,
      },
      db
    );
  } else {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "mining",
        entityId: id,
        entityCode: before.code,
        offerId: null,
        action: "updated",
        description: `${actor.name ?? "Alguém"} editou ${before.code}`,
      },
      db
    );
  }

  await batch.commit();
}

export async function softDeleteMiningItem(
  id: string,
  actor: Actor
): Promise<void> {
  await adminDb()
    .collection(COL.miningItems)
    .doc(id)
    .update(auditOnSoftDelete(actor.uid));
}

/**
 * Transformar em oferta (secoes 13, 15): cria uma Offer de verdade a
 * partir dos dados ja preenchidos na mineracao, preservando o vinculo.
 * Nao apaga nem move a mineracao — ela fica marcada "modelada".
 */
export async function convertMiningToOffer(
  miningId: string,
  ticketPrice: number | null | undefined,
  actor: Actor
): Promise<Offer> {
  const item = await getMiningItemById(miningId);
  if (!item) throw new Error("Oferta minerada não encontrada.");
  if (item.convertedOfferId) {
    throw new Error("Esta oferta minerada já foi transformada.");
  }

  const offer = await createOffer(
    {
      name: item.name,
      niche: item.niche,
      subNiche: null,
      country: item.country ?? "BR",
      language: "pt-BR",
      mainPromise: item.promise,
      mechanism: item.mechanism,
      targetAudience: item.targetAudience,
      ticketPrice: ticketPrice ?? item.price ?? null,
      status: "aprovada",
      health: "saudavel",
      priority: "media",
      responsibleId: actor.uid,
      miningItemId: item.id,
      nextAction: "Definir ângulos e copy inicial",
      nextActionDue: null,
      launchDate: null,
      validationDate: null,
      scalingDate: null,
      notes: item.whyInteresting
        ? `Origem: mineração ${item.code}. ${item.whyInteresting}`
        : `Origem: mineração ${item.code}.`,
      angles: [],
      pages: [],
      campaigns: [],
    },
    actor
  );

  await adminDb()
    .collection(COL.miningItems)
    .doc(miningId)
    .update({
      status: "modelada",
      convertedOfferId: offer.id,
      ...auditOnUpdate(actor.uid),
    });

  return offer;
}
