import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import type { AuditFields } from "@/types/domain";

/**
 * Conversao entre o formato do Firestore e os tipos de dominio.
 *
 * Regra: nada acima de `src/services/firestore/` enxerga Timestamp.
 * O dominio fala string ISO; o banco fala Timestamp.
 */

export function tsToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function isoToTs(value: string | null | undefined): Timestamp | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

/** Timestamps de auditoria em string ISO, com fallback para agora. */
export function readAudit(data: FirebaseFirestore.DocumentData): AuditFields {
  const now = new Date().toISOString();
  return {
    createdAt: tsToIso(data.createdAt) ?? now,
    createdBy: data.createdBy ?? null,
    updatedAt: tsToIso(data.updatedAt) ?? now,
    updatedBy: data.updatedBy ?? null,
    deletedAt: tsToIso(data.deletedAt),
  };
}

/**
 * Campos de auditoria de criacao.
 *
 * `deletedAt: null` e EXPLICITO e obrigatorio: as queries filtram por
 * `deletedAt == null`, e no Firestore um campo ausente nao casa com essa
 * condicao — o documento sumiria da listagem.
 */
export function auditOnCreate(uid: string) {
  return {
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
    deletedAt: null as null,
  };
}

export function auditOnUpdate(uid: string) {
  return {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };
}

export function auditOnSoftDelete(uid: string) {
  return {
    deletedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };
}

/**
 * Remove chaves `undefined` antes de escrever.
 * O Firestore rejeita undefined; null e um valor legitimo e permanece.
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}
