import "server-only";

import type { Transaction } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { COL, formatCode, type CounterKey } from "@/lib/firebase/collections";

/**
 * Codigos sequenciais (OFFER-0001, CR-0001, CHIP-001...).
 *
 * O Firestore nao tem sequences, entao o proximo numero sai de uma
 * transacao sobre `counters/{key}`. A transacao garante que dois usuarios
 * criando ofertas ao mesmo tempo nunca recebam o mesmo codigo.
 *
 * `counters` e negado ao cliente em firestore.rules: so o Admin SDK
 * escreve aqui, e sempre a partir de uma server action com guard.
 *
 * Limite de escrita do Firestore por documento e ~1/s sustentado. Criar
 * oferta e criativo e uma acao humana, entao nao ha contencao real.
 */
export async function nextCode(
  key: CounterKey,
  tx: Transaction
): Promise<string> {
  const ref = adminDb().collection(COL.counters).doc(key);
  const snap = await tx.get(ref);
  const current = snap.exists ? ((snap.data()?.seq as number) ?? 0) : 0;
  const next = current + 1;

  // set com merge cobre o caso do contador ainda nao existir
  tx.set(ref, { seq: next }, { merge: true });

  return formatCode(key, next);
}

/**
 * Le o valor atual sem consumir. Usado pelo seed para saber onde parou.
 */
export async function peekCounter(key: CounterKey): Promise<number> {
  const snap = await adminDb().collection(COL.counters).doc(key).get();
  return snap.exists ? ((snap.data()?.seq as number) ?? 0) : 0;
}

/** Reposiciona o contador. Apenas para seed e manutencao. */
export async function setCounter(key: CounterKey, seq: number): Promise<void> {
  await adminDb().collection(COL.counters).doc(key).set({ seq }, { merge: true });
}
