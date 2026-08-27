import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCardsSkeleton } from "@/components/shared/page-skeleton";
import { requireAuth, type AuthContext } from "@/lib/auth/guard";
import { canRead } from "@/lib/auth/permissions";
import { businessDate } from "@/lib/format";
import { deriveFrom } from "@/lib/metrics";
import { parsePeriod, periodRange, previousPeriodRange } from "@/lib/period";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import type { DashboardData, RunningOfferRow } from "@/features/dashboard/types";
import { getChipCapacity } from "@/services/firestore/chips.repo";
import { getCashSummary } from "@/services/firestore/finance.repo";
import { listLaunchQueue, listOffers } from "@/services/firestore/offers.repo";
import { listDecisions, listTasks } from "@/services/firestore/tasks.repo";
import {
  groupByOffer,
  listMetricsByDate,
  listMetricsByDateRange,
} from "@/services/firestore/metrics.repo";
import { getAppSettings } from "@/services/firestore/settings.repo";
import { OFFER_LIVE_STATUSES } from "@/types/domain";

export const metadata = { title: "Visão Geral" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

/**
 * Dashboard (§9-§12, §19).
 *
 * Gasto/receita/lucro/ROAS do periodo escolhido (Hoje/Ontem/7 dias/Este
 * mes/Total, via §period) com comparacao vs. o periodo equivalente
 * anterior, ofertas rodando (sempre "hoje" — e o que esta acontecendo
 * agora), fila de lancamento, capacidade de chips e alertas simples
 * calculados na aplicacao — nada de IA.
 *
 * A busca pesada roda num componente async separado, dentro de
 * Suspense: o shell (titulo) aparece na hora, o resto entra quando
 * chega. Nao existe notFound() aqui, entao streaming e seguro.
 */
export default async function DashboardPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const { period: rawPeriod } = await searchParams;
  const period = parsePeriod(rawPeriod);

  return (
    <div className="space-y-6">
      <PageHeader title="Visão Geral" />
      <Suspense fallback={<StatCardsSkeleton />}>
        <DashboardContent ctx={ctx} period={period} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({
  ctx,
  period,
}: {
  ctx: AuthContext;
  period: ReturnType<typeof parsePeriod>;
}) {
  const today = businessDate();
  const range = periodRange(period, today);
  const prevRange = previousPeriodRange(period, today);

  const [
    offers,
    periodMetrics,
    prevMetrics,
    todayMetrics,
    launchQueue,
    decisions,
    myTasks,
    settings,
  ] = await Promise.all([
    listOffers(),
    listMetricsByDateRange(range.from, range.to),
    prevRange ? listMetricsByDateRange(prevRange.from, prevRange.to) : Promise.resolve([]),
    listMetricsByDate(today),
    listLaunchQueue(8),
    listDecisions({ status: "aberta" }),
    listTasks({ responsibleId: ctx.uid }),
    getAppSettings(),
  ]);

  const canSeeFinance = canRead(ctx.role, "finance");
  const [chipCapacity, cash] = await Promise.all([
    getChipCapacity(),
    canSeeFinance ? getCashSummary() : Promise.resolve(null),
  ]);

  const todayCard = {
    today: deriveFrom(periodMetrics),
    yesterday: prevMetrics.length ? deriveFrom(prevMetrics) : null,
  };

  // "Rodando agora" e sempre o dia de hoje — mostra o que esta
  // acontecendo neste instante, independente do periodo escolhido acima.
  const todayByOffer = groupByOffer(todayMetrics);
  const liveOffers = offers.filter((o) =>
    (OFFER_LIVE_STATUSES as string[]).includes(o.status)
  );
  const running: RunningOfferRow[] = liveOffers
    .map((offer) => ({
      offer,
      today: deriveFrom(todayByOffer.get(offer.id) ?? []),
    }))
    .sort((a, b) => b.today.spend - a.today.spend);

  // Alertas simples (§12) — regras na aplicacao, sem IA.
  const alerts: DashboardData["alerts"] = [];
  for (const row of running) {
    if (row.today.spend > 0 && row.today.operationalProfit < 0) {
      alerts.push({
        id: `loss-${row.offer.id}`,
        severity: "danger",
        message: `${row.offer.name} está no prejuízo hoje`,
        href: `/ofertas/${row.offer.code}`,
      });
    }
  }
  for (const offer of offers) {
    if (
      !offer.deletedAt &&
      !offer.nextAction &&
      offer.status !== "morta" &&
      offer.status !== "pausada"
    ) {
      alerts.push({
        id: `no-action-${offer.id}`,
        severity: "warn",
        message: `${offer.name} não tem próxima ação definida`,
        href: `/ofertas/${offer.code}`,
      });
    }
  }
  const overdueTasks = myTasks.filter(
    (t) => t.status !== "concluido" && t.deadline && t.deadline < today
  );
  if (overdueTasks.length > 0) {
    alerts.push({
      id: "overdue-tasks",
      severity: "warn",
      message: `${overdueTasks.length} ${overdueTasks.length === 1 ? "tarefa vencida" : "tarefas vencidas"} atribuídas a você`,
      href: "/tarefas",
    });
  }
  if (chipCapacity.total < settings.chipsTarget) {
    alerts.push({
      id: "chips-below-target",
      severity: "warn",
      message: `${chipCapacity.total} de ${settings.chipsTarget} chips — abaixo da meta`,
      href: "/chips",
    });
  }

  const data: DashboardData = {
    period,
    todayCard,
    running,
    launchQueue,
    chipCapacity,
    chipsTarget: settings.chipsTarget,
    decisions,
    myTasks: myTasks.filter((t) => t.status !== "concluido"),
    alerts,
  };

  return (
    <DashboardView
      data={data}
      cash={cash}
      canSeeFinance={canSeeFinance}
      offerCount={offers.length}
    />
  );
}
