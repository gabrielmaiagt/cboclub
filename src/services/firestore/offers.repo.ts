import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { COL, COUNTER_KEYS } from "@/lib/firebase/collections";
import { appendActivity } from "@/services/firestore/activity.repo";
import { nextCode } from "@/services/firestore/counters";
import {
  auditOnCreate,
  auditOnSoftDelete,
  auditOnUpdate,
  isoToTs,
  readAudit,
  stripUndefined,
  tsToIso,
} from "@/services/firestore/converters";
import type { OfferFormOutput, OfferUpdateValues } from "@/lib/schemas/offer";
import {
  OFFER_STATUS_LABELS,
  type Offer,
  type OfferHealth,
  type OfferStatus,
} from "@/types/domain";

/**
 * Repositorio de ofertas.
 *
 * Todo metodo recebe o `actor` ja validado pelo guard — este arquivo nao
 * decide permissao, apenas persiste. Autorizacao vive em
 * `src/lib/auth/guard.ts` e em firestore.rules.
 */

export interface Actor {
  uid: string;
  name: string | null;
}

// ── Leitura ─────────────────────────────────────────────────────────

function toOffer(
  doc: FirebaseFirestore.DocumentSnapshot
): Offer {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    name: d.name,
    niche: d.niche ?? null,
    subNiche: d.subNiche ?? null,
    country: d.country ?? "BR",
    language: d.language ?? "pt-BR",
    mainPromise: d.mainPromise ?? null,
    mechanism: d.mechanism ?? null,
    targetAudience: d.targetAudience ?? null,
    ticketPrice: d.ticketPrice ?? null,
    status: d.status as OfferStatus,
    health: (d.health ?? "saudavel") as OfferHealth,
    priority: d.priority ?? "media",
    responsibleId: d.responsibleId ?? null,
    miningItemId: d.miningItemId ?? null,
    nextAction: d.nextAction ?? null,
    nextActionDue: d.nextActionDue ?? null,
    launchDate: d.launchDate ?? null,
    validationDate: d.validationDate ?? null,
    scalingDate: d.scalingDate ?? null,
    notes: d.notes ?? null,
    angles: d.angles ?? [],
    pages: d.pages ?? [],
    campaigns: d.campaigns ?? [],
    ...readAudit(d),
  };
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const snap = await adminDb().collection(COL.offers).doc(id).get();
  if (!snap.exists) return null;
  const offer = toOffer(snap);
  return offer.deletedAt ? null : offer;
}

/** Busca por codigo legivel (OFFER-0007) — e o que aparece na URL. */
export async function getOfferByCode(code: string): Promise<Offer | null> {
  const snap = await adminDb()
    .collection(COL.offers)
    .where("code", "==", code.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  const offer = toOffer(snap.docs[0]);
  return offer.deletedAt ? null : offer;
}

export interface ListOffersOptions {
  status?: OfferStatus[];
  responsibleId?: string;
  includeDeleted?: boolean;
  limit?: number;
}

/**
 * Lista ofertas. Sao dezenas, entao carregamos todas e filtramos os
 * recortes finos em memoria — mais barato que varios indices compostos.
 */
export async function listOffers(
  options: ListOffersOptions = {}
): Promise<Offer[]> {
  let q = adminDb()
    .collection(COL.offers)
    .where("deletedAt", "==", null)
    .orderBy("updatedAt", "desc") as FirebaseFirestore.Query;

  if (options.responsibleId) {
    q = adminDb()
      .collection(COL.offers)
      .where("deletedAt", "==", null)
      .where("responsibleId", "==", options.responsibleId)
      .orderBy("updatedAt", "desc");
  }

  const snap = await q.limit(options.limit ?? 300).get();
  let offers = snap.docs.map(toOffer);

  if (options.status?.length) {
    const wanted = new Set(options.status);
    offers = offers.filter((o) => wanted.has(o.status));
  }
  return offers;
}

/** Fila de Lancamento: ofertas em producao com prazo definido. */
export async function listLaunchQueue(limit = 20): Promise<Offer[]> {
  const snap = await adminDb()
    .collection(COL.offers)
    .where("deletedAt", "==", null)
    .where("status", "in", [
      "aprovada",
      "modelagem",
      "copy",
      "criativos",
      "pagina",
      "configuracao",
    ])
    .orderBy("nextActionDue", "asc")
    .limit(limit)
    .get();
  return snap.docs.map(toOffer);
}

// ── Escrita ─────────────────────────────────────────────────────────

/**
 * Cria a oferta e o codigo sequencial numa unica transacao, junto do
 * registro de activity. Ou tudo entra, ou nada entra.
 */
export async function createOffer(
  input: OfferFormOutput,
  actor: Actor
): Promise<Offer> {
  const db = adminDb();
  const ref = db.collection(COL.offers).doc();

  const code = await db.runTransaction(async (tx) => {
    const generated = await nextCode(COUNTER_KEYS.offers, tx);

    tx.set(
      ref,
      stripUndefined({
        code: generated,
        name: input.name,
        niche: input.niche,
        subNiche: input.subNiche,
        country: input.country,
        language: input.language,
        mainPromise: input.mainPromise,
        mechanism: input.mechanism,
        targetAudience: input.targetAudience,
        ticketPrice: input.ticketPrice,
        status: input.status,
        health: input.health,
        priority: input.priority,
        responsibleId: input.responsibleId,
        miningItemId: input.miningItemId,
        nextAction: input.nextAction,
        nextActionDue: input.nextActionDue,
        launchDate: input.launchDate,
        validationDate: input.validationDate,
        scalingDate: input.scalingDate,
        notes: input.notes,
        angles: input.angles,
        pages: input.pages,
        campaigns: input.campaigns,
        ...auditOnCreate(actor.uid),
      })
    );

    appendActivity(
      tx,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "offer",
        entityId: ref.id,
        entityCode: generated,
        offerId: ref.id,
        action: "created",
        description: `${actor.name ?? "Alguém"} criou a oferta ${generated} — ${input.name}`,
      },
      db
    );

    return generated;
  });

  const created = await getOfferById(ref.id);
  if (!created) {
    throw new Error(`Oferta ${code} não encontrada após a criação.`);
  }
  return created;
}

export async function updateOffer(
  id: string,
  patch: OfferUpdateValues,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.offers).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Oferta não encontrada.");

  const before = toOffer(snap);
  const batch = db.batch();

  batch.update(ref, stripUndefined({ ...patch, ...auditOnUpdate(actor.uid) }));

  // Mudanca de status merece uma linha propria na timeline
  if (patch.status && patch.status !== before.status) {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "offer",
        entityId: id,
        entityCode: before.code,
        offerId: id,
        action: "status_changed",
        field: "status",
        oldValue: before.status,
        newValue: patch.status,
        description: `${actor.name ?? "Alguém"} alterou ${before.code} de ${
          OFFER_STATUS_LABELS[before.status]
        } para ${OFFER_STATUS_LABELS[patch.status]}`,
      },
      db
    );
  } else {
    appendActivity(
      batch,
      {
        actorId: actor.uid,
        actorName: actor.name,
        entityType: "offer",
        entityId: id,
        entityCode: before.code,
        offerId: id,
        action: "updated",
        description: `${actor.name ?? "Alguém"} editou a oferta ${before.code}`,
      },
      db
    );
  }

  await batch.commit();
}

/** Atalho do Kanban: arrastar o card entre colunas. */
export async function changeOfferStatus(
  id: string,
  status: OfferStatus,
  actor: Actor
): Promise<void> {
  const patch: OfferUpdateValues = { status };

  // Carimba as datas do ciclo de vida na primeira vez que a oferta
  // atinge cada marco, sem sobrescrever se ela voltar ao estagio.
  const snap = await adminDb().collection(COL.offers).doc(id).get();
  if (snap.exists) {
    const current = toOffer(snap);
    const today = new Date().toISOString().slice(0, 10);
    if (status === "testando" && !current.launchDate) patch.launchDate = today;
    if (status === "validada" && !current.validationDate)
      patch.validationDate = today;
    if (status === "escalando" && !current.scalingDate) patch.scalingDate = today;
  }

  await updateOffer(id, patch, actor);
}

export async function setOfferHealth(
  id: string,
  health: OfferHealth,
  actor: Actor
): Promise<void> {
  await updateOffer(id, { health }, actor);
}

/**
 * Soft delete. Nao apagamos conhecimento operacional (principio #6):
 * a oferta some das listagens mas continua no banco e no historico.
 */
export async function softDeleteOffer(
  id: string,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COL.offers).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Oferta não encontrada.");

  const before = toOffer(snap);
  const batch = db.batch();

  batch.update(ref, auditOnSoftDelete(actor.uid));
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "offer",
      entityId: id,
      entityCode: before.code,
      offerId: id,
      action: "deleted",
      description: `${actor.name ?? "Alguém"} arquivou a oferta ${before.code}`,
    },
    db
  );

  await batch.commit();
}

export async function restoreOffer(id: string, actor: Actor): Promise<void> {
  await adminDb()
    .collection(COL.offers)
    .doc(id)
    .update({ deletedAt: null, ...auditOnUpdate(actor.uid) });
}

/** Contagem por status para os 9 chips do dashboard. */
export function countByStatus(
  offers: readonly Offer[]
): Record<OfferStatus, number> {
  const counts = {} as Record<OfferStatus, number>;
  for (const offer of offers) {
    counts[offer.status] = (counts[offer.status] ?? 0) + 1;
  }
  return counts;
}

export const __internal = { toOffer, isoToTs, tsToIso, FieldValue };
