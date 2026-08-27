import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import { readAudit } from "@/services/firestore/converters";
import type { MiningItem, MiningStatus } from "@/types/domain";

/**
 * Mineracao — leitura minima nesta fase.
 *
 * O modulo completo (quick capture, score, Kanban, converter em oferta,
 * dossie com referencias §14) e a Fase 5. Este repo existe agora apenas
 * para o select "oferta minerada relacionada" das referencias.
 */

function toMiningItem(doc: FirebaseFirestore.DocumentSnapshot): MiningItem {
  const d = doc.data()!;
  return {
    id: doc.id,
    code: d.code,
    name: d.name,
    url: d.url ?? null,
    whyInteresting: d.whyInteresting ?? null,
    status: (d.status ?? "encontrada") as MiningStatus,
    niche: d.niche ?? null,
    promise: d.promise ?? null,
    mechanism: d.mechanism ?? null,
    price: d.price ?? null,
    advertiser: d.advertiser ?? null,
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
