import "server-only";

import { AggregateField } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import { appendActivity } from "@/services/firestore/activity.repo";
import {
  auditOnCreate,
  auditOnUpdate,
  readAudit,
  stripUndefined,
  tsToIso,
} from "@/services/firestore/converters";
import type { Actor } from "@/services/firestore/offers.repo";
import type {
  ContributionFormOutput,
  DistributionFormOutput,
  ExpenseFormOutput,
  PartnerFormOutput,
  RecurringCostFormOutput,
  RevenueFormOutput,
} from "@/lib/schemas/finance";
import type {
  LedgerEntry,
  LedgerKind,
  Partner,
  RecurringCost,
} from "@/types/domain";
import { NON_PNL_EXPENSE_CATEGORIES } from "@/types/domain";

/**
 * Financeiro (secoes 30-38). Um ledger so, quatro naturezas — expense,
 * revenue, contribution, distribution — em vez de quatro colecoes 1:1
 * com as tabelas do desenho original em Postgres.
 *
 * Anti-dupla-contagem (secao 33): trafego e gateway ja entram via
 * dailyMetrics, entao despesas dessas categorias nascem com
 * countsInPnl=false — ficam registradas no caixa mas nao duplicam o
 * gasto no P&L. Aportes e distribuicoes NUNCA contam como receita ou
 * despesa operacional.
 */

// ── Leitura ─────────────────────────────────────────────────────────

function toLedgerEntry(doc: FirebaseFirestore.DocumentSnapshot): LedgerEntry {
  const d = doc.data()!;
  return {
    id: doc.id,
    kind: d.kind as LedgerKind,
    amount: d.amount ?? 0,
    date: d.date,
    description: d.description ?? null,
    notes: d.notes ?? null,
    category: d.category ?? null,
    offerId: d.offerId ?? null,
    recurring: d.recurring ?? false,
    receiptPath: d.receiptPath ?? null,
    countsInPnl: d.countsInPnl !== false,
    source: d.source ?? null,
    partnerId: d.partnerId ?? null,
    period: d.period ?? null,
    createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
    createdBy: d.createdBy ?? null,
  };
}

export async function listLedger(
  options: {
    kind?: LedgerKind;
    offerId?: string;
    partnerId?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {}
): Promise<LedgerEntry[]> {
  let q: FirebaseFirestore.Query = adminDb().collection(COL.ledger);
  if (options.kind) q = q.where("kind", "==", options.kind);
  if (options.offerId) q = q.where("offerId", "==", options.offerId);
  if (options.partnerId) q = q.where("partnerId", "==", options.partnerId);
  const snap = await q.orderBy("date", "desc").limit(options.limit ?? 500).get();
  let rows = snap.docs.map(toLedgerEntry);
  if (options.from) rows = rows.filter((r) => r.date >= options.from!);
  if (options.to) rows = rows.filter((r) => r.date <= options.to!);
  return rows;
}

/** Caixa da operacao (secao 33) via aggregation query — sem trazer docs. */
export async function getCashSummary(): Promise<{
  contributions: number;
  distributions: number;
  revenueOther: number;
  expensesInPnl: number;
}> {
  const col = adminDb().collection(COL.ledger);

  async function sumWhere(kind: LedgerKind, extra?: (q: FirebaseFirestore.Query) => FirebaseFirestore.Query) {
    let q: FirebaseFirestore.Query = col.where("kind", "==", kind);
    if (extra) q = extra(q);
    const agg = await q.aggregate({ total: AggregateField.sum("amount") }).get();
    return agg.data().total ?? 0;
  }

  const [contributions, distributions, revenueOther, allExpenses] = await Promise.all([
    sumWhere("contribution"),
    sumWhere("distribution"),
    sumWhere("revenue"),
    listLedger({ kind: "expense", limit: 5000 }),
  ]);

  const expensesInPnl = allExpenses
    .filter((e) => e.countsInPnl)
    .reduce((sum, e) => sum + e.amount, 0);

  return { contributions, distributions, revenueOther, expensesInPnl };
}

// ── Escrita: ledger ─────────────────────────────────────────────────

async function createLedgerEntry(
  fields: Record<string, unknown>,
  entityLabel: string,
  actor: Actor
): Promise<LedgerEntry> {
  const db = adminDb();
  const ref = db.collection(COL.ledger).doc();
  const batch = db.batch();

  batch.set(ref, stripUndefined({ ...fields, ...auditOnCreate(actor.uid) }));
  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "ledger",
      entityId: ref.id,
      entityCode: null,
      offerId: (fields.offerId as string | null) ?? null,
      action: "created",
      description: `${actor.name ?? "Alguém"} registrou ${entityLabel}`,
    },
    db
  );

  await batch.commit();
  const snap = await ref.get();
  return toLedgerEntry(snap);
}

export async function createExpense(
  input: ExpenseFormOutput,
  actor: Actor
): Promise<LedgerEntry> {
  const countsInPnl = !NON_PNL_EXPENSE_CATEGORIES.includes(input.category);
  return createLedgerEntry(
    {
      kind: "expense",
      amount: input.amount,
      date: input.date,
      description: input.description,
      category: input.category,
      offerId: input.offerId,
      recurring: input.recurring,
      receiptPath: input.receiptPath,
      countsInPnl,
      notes: input.notes,
      source: null,
      partnerId: null,
      period: null,
    },
    `uma despesa de R$ ${input.amount.toFixed(2)}`,
    actor
  );
}

export async function createRevenue(
  input: RevenueFormOutput,
  actor: Actor
): Promise<LedgerEntry> {
  return createLedgerEntry(
    {
      kind: "revenue",
      amount: input.amount,
      date: input.date,
      description: input.description,
      source: input.source,
      offerId: input.offerId,
      notes: input.notes,
      category: null,
      recurring: false,
      receiptPath: null,
      countsInPnl: true,
      partnerId: null,
      period: null,
    },
    `uma receita de R$ ${input.amount.toFixed(2)}`,
    actor
  );
}

export async function createContribution(
  input: ContributionFormOutput,
  actor: Actor
): Promise<LedgerEntry> {
  return createLedgerEntry(
    {
      kind: "contribution",
      amount: input.amount,
      date: input.date,
      partnerId: input.partnerId,
      notes: input.notes,
      description: null,
      category: null,
      offerId: null,
      recurring: false,
      receiptPath: null,
      countsInPnl: false,
      source: null,
      period: null,
    },
    `um aporte de R$ ${input.amount.toFixed(2)}`,
    actor
  );
}

export async function createDistribution(
  input: DistributionFormOutput,
  actor: Actor
): Promise<LedgerEntry> {
  return createLedgerEntry(
    {
      kind: "distribution",
      amount: input.amount,
      date: input.date,
      partnerId: input.partnerId,
      period: input.period,
      notes: input.notes,
      description: null,
      category: null,
      offerId: null,
      recurring: false,
      receiptPath: null,
      countsInPnl: false,
      source: null,
    },
    `uma distribuição de R$ ${input.amount.toFixed(2)}`,
    actor
  );
}

// ── Socios ──────────────────────────────────────────────────────────

function toPartner(doc: FirebaseFirestore.DocumentSnapshot): Partner {
  const d = doc.data()!;
  return {
    id: doc.id,
    name: d.name,
    ownershipPercentage: d.ownershipPercentage ?? 0,
    active: d.active !== false,
    createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
    updatedAt: tsToIso(d.updatedAt) ?? new Date().toISOString(),
  };
}

export async function listPartners(): Promise<Partner[]> {
  const snap = await adminDb().collection(COL.partners).orderBy("name").get();
  return snap.docs.map(toPartner);
}

export async function createPartner(
  input: PartnerFormOutput,
  actor: Actor
): Promise<Partner> {
  const db = adminDb();
  const ref = db.collection(COL.partners).doc();
  await ref.set({
    name: input.name,
    ownershipPercentage: input.ownershipPercentage,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  void actor;
  const snap = await ref.get();
  return toPartner(snap);
}

/** Total aportado/distribuido por socio, para a estimativa (secao 37). */
export async function getPartnerTotals(
  partnerId: string
): Promise<{ contributed: number; distributed: number }> {
  const col = adminDb().collection(COL.ledger).where("partnerId", "==", partnerId);
  const [contrib, distrib] = await Promise.all([
    col.where("kind", "==", "contribution").aggregate({ t: AggregateField.sum("amount") }).get(),
    col.where("kind", "==", "distribution").aggregate({ t: AggregateField.sum("amount") }).get(),
  ]);
  return {
    contributed: contrib.data().t ?? 0,
    distributed: distrib.data().t ?? 0,
  };
}

// ── Custos recorrentes ──────────────────────────────────────────────

function toRecurringCost(doc: FirebaseFirestore.DocumentSnapshot): RecurringCost {
  const d = doc.data()!;
  return {
    id: doc.id,
    name: d.name,
    category: d.category,
    amount: d.amount ?? 0,
    frequency: d.frequency ?? "mensal",
    nextChargeDate: d.nextChargeDate ?? null,
    responsibleId: d.responsibleId ?? null,
    active: d.active !== false,
    createdAt: tsToIso(d.createdAt) ?? new Date().toISOString(),
    updatedAt: tsToIso(d.updatedAt) ?? new Date().toISOString(),
  };
}

export async function listRecurringCosts(): Promise<RecurringCost[]> {
  const snap = await adminDb().collection(COL.recurringCosts).orderBy("name").get();
  return snap.docs.map(toRecurringCost);
}

export async function createRecurringCost(
  input: RecurringCostFormOutput
): Promise<RecurringCost> {
  const db = adminDb();
  const ref = db.collection(COL.recurringCosts).doc();
  await ref.set(
    stripUndefined({
      name: input.name,
      category: input.category,
      amount: input.amount,
      frequency: input.frequency,
      nextChargeDate: input.nextChargeDate,
      responsibleId: input.responsibleId,
      active: input.active,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );
  const snap = await ref.get();
  return toRecurringCost(snap);
}

export async function setRecurringCostActive(
  id: string,
  active: boolean
): Promise<void> {
  await adminDb()
    .collection(COL.recurringCosts)
    .doc(id)
    .update({ active, updatedAt: new Date() });
}

/** Previsao mensal total dos custos recorrentes ativos (secao 38). */
export function monthlyForecast(costs: RecurringCost[]): number {
  return costs
    .filter((c) => c.active)
    .reduce((sum, c) => sum + (c.frequency === "anual" ? c.amount / 12 : c.amount), 0);
}
