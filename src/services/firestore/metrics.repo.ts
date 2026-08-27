import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import { tsToIso } from "@/services/firestore/converters";
import type { DailyMetric } from "@/types/domain";

/**
 * Metricas diarias por oferta.
 *
 * Doc id = `${date}_${offerId}`, o que torna a gravacao idempotente: o
 * mesmo dia da mesma oferta sempre escreve no mesmo documento, entao nao
 * existe linha duplicada nem precisa de checagem previa.
 *
 * Os documentos guardam SOMENTE dados-base. CTR, CPC, CPM, CPL, CPA,
 * ROAS, ROI e ticket medio sao calculados em `lib/metrics.ts` na leitura.
 */

export function metricDocId(date: string, offerId: string): string {
  return `${date}_${offerId}`;
}

function toMetric(doc: FirebaseFirestore.DocumentSnapshot): DailyMetric {
  const d = doc.data()!;
  const now = new Date().toISOString();
  return {
    id: doc.id,
    date: d.date,
    offerId: d.offerId,
    spend: d.spend ?? 0,
    impressions: d.impressions ?? 0,
    clicks: d.clicks ?? 0,
    leads: d.leads ?? 0,
    sales: d.sales ?? 0,
    revenue: d.revenue ?? 0,
    refunds: d.refunds ?? 0,
    gatewayFees: d.gatewayFees ?? 0,
    additionalCosts: d.additionalCosts ?? 0,
    notes: d.notes ?? null,
    createdAt: tsToIso(d.createdAt) ?? now,
    createdBy: d.createdBy ?? null,
    updatedAt: tsToIso(d.updatedAt) ?? now,
    updatedBy: d.updatedBy ?? null,
  };
}

/** Todas as ofertas num dia. Alimenta as colunas "hoje" da listagem. */
export async function listMetricsByDate(date: string): Promise<DailyMetric[]> {
  const snap = await adminDb()
    .collection(COL.dailyMetrics)
    .where("date", "==", date)
    .get();
  return snap.docs.map(toMetric);
}

/** Serie de uma oferta. Alimenta os graficos da pagina da oferta. */
export async function listMetricsByOffer(
  offerId: string,
  options: { from?: string; to?: string; limit?: number } = {}
): Promise<DailyMetric[]> {
  let q = adminDb()
    .collection(COL.dailyMetrics)
    .where("offerId", "==", offerId) as FirebaseFirestore.Query;

  if (options.from) q = q.where("date", ">=", options.from);
  if (options.to) q = q.where("date", "<=", options.to);

  const snap = await q.orderBy("date", "asc").limit(options.limit ?? 400).get();
  return snap.docs.map(toMetric);
}

/**
 * Totais acumulados de uma oferta via aggregation query.
 *
 * O servidor soma sem trazer documento por documento — e o que substitui
 * as views do Postgres sem precisar de contador mantido por Function.
 */
export async function aggregateOfferTotals(offerId: string): Promise<{
  spend: number;
  revenue: number;
  sales: number;
  leads: number;
  clicks: number;
  impressions: number;
  refunds: number;
  gatewayFees: number;
  additionalCosts: number;
  days: number;
}> {
  const base = adminDb()
    .collection(COL.dailyMetrics)
    .where("offerId", "==", offerId);

  const { sum, count } = await import("firebase-admin/firestore").then((m) => ({
    sum: m.AggregateField.sum,
    count: m.AggregateField.count,
  }));

  // O Firestore limita a quantidade de agregacoes por chamada, entao
  // dividimos em dois grupos.
  const [money, volume] = await Promise.all([
    base
      .aggregate({
        spend: sum("spend"),
        revenue: sum("revenue"),
        refunds: sum("refunds"),
        gatewayFees: sum("gatewayFees"),
        additionalCosts: sum("additionalCosts"),
      })
      .get(),
    base
      .aggregate({
        sales: sum("sales"),
        leads: sum("leads"),
        clicks: sum("clicks"),
        impressions: sum("impressions"),
        days: count(),
      })
      .get(),
  ]);

  const m = money.data();
  const v = volume.data();

  return {
    spend: m.spend ?? 0,
    revenue: m.revenue ?? 0,
    refunds: m.refunds ?? 0,
    gatewayFees: m.gatewayFees ?? 0,
    additionalCosts: m.additionalCosts ?? 0,
    sales: v.sales ?? 0,
    leads: v.leads ?? 0,
    clicks: v.clicks ?? 0,
    impressions: v.impressions ?? 0,
    days: v.days ?? 0,
  };
}

/** Agrupa metricas por offerId — usado para montar a coluna "hoje". */
export function groupByOffer(
  metrics: readonly DailyMetric[]
): Map<string, DailyMetric[]> {
  const map = new Map<string, DailyMetric[]>();
  for (const metric of metrics) {
    const list = map.get(metric.offerId);
    if (list) list.push(metric);
    else map.set(metric.offerId, [metric]);
  }
  return map;
}

// ── Escrita ─────────────────────────────────────────────────────────

import { appendActivity } from "@/services/firestore/activity.repo";
import { auditOnCreate, auditOnUpdate, stripUndefined } from "@/services/firestore/converters";
import type { Actor } from "@/services/firestore/offers.repo";
import type { DailyMetricFormOutput } from "@/lib/schemas/metrics";

/**
 * Upsert idempotente (§28): mesmo dia + mesma oferta sempre escreve no
 * mesmo documento (id = `${date}_${offerId}`). Registrar duas vezes o
 * mesmo dia corrige o lancamento em vez de duplicar.
 */
export async function upsertDailyMetric(
  input: DailyMetricFormOutput,
  actor: Actor
): Promise<void> {
  const db = adminDb();
  const id = metricDocId(input.date, input.offerId);
  const ref = db.collection(COL.dailyMetrics).doc(id);
  const snap = await ref.get();
  const isNew = !snap.exists;

  const batch = db.batch();
  batch.set(
    ref,
    stripUndefined({
      date: input.date,
      offerId: input.offerId,
      spend: input.spend,
      impressions: input.impressions,
      clicks: input.clicks,
      leads: input.leads,
      sales: input.sales,
      revenue: input.revenue,
      refunds: input.refunds,
      gatewayFees: input.gatewayFees,
      additionalCosts: input.additionalCosts,
      notes: input.notes,
      ...(isNew ? auditOnCreate(actor.uid) : auditOnUpdate(actor.uid)),
    }),
    { merge: true }
  );

  appendActivity(
    batch,
    {
      actorId: actor.uid,
      actorName: actor.name,
      entityType: "dailyMetric",
      entityId: id,
      entityCode: null,
      offerId: input.offerId,
      action: isNew ? "created" : "updated",
      description: `${actor.name ?? "Alguém"} registrou métricas de ${input.date}: R$ ${input.spend.toFixed(2)} gasto, R$ ${input.revenue.toFixed(2)} receita`,
    },
    db
  );

  await batch.commit();
}
