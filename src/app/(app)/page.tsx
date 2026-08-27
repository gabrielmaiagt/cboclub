import { requireAuth } from "@/lib/auth/guard";
import { canRead } from "@/lib/auth/permissions";
import { businessDate, shiftDate } from "@/lib/format";
import { deriveFrom } from "@/lib/metrics";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import type { DashboardData, RunningOfferRow } from "@/features/dashboard/types";
import { getChipCapacity } from "@/services/firestore/chips.repo";
import { getCashSummary } from "@/services/firestore/finance.repo";
import { listLaunchQueue, listOffers } from "@/services/firestore/offers.repo";
import { listDecisions, listTasks } from "@/services/firestore/tasks.repo";
import { groupByOffer, listMetricsByDate } from "@/services/firestore/metrics.repo";
import { getAppSettings } from "@/services/firestore/settings.repo";
import { OFFER_LIVE_STATUSES } from "@/types/domain";

export const metadata = { title: "Visão Geral" };
export const dynamic = "force-dynamic";

/**
 * Dashboard (§9-§12, §19).
 *
 * So o que ajuda decisao agora: gasto/receita/lucro/ROAS de hoje com
 * comparacao com ontem, ofertas rodando, fila de lancamento, capacidade
 * de chips e alertas simples calculados na aplicacao — nada de IA.
 */
export default async function DashboardPage() {
  const ctx = await requireAuth();
  const today = businessDate();
  const yesterday = shiftDate(today, -1);

  const [
    offers,
    todayMetrics,
    yesterdayMetrics,
    launchQueue,
    decisions,
    myTasks,
    settings,
  ] = await Promise.all([
    listOffers(),
    listMetricsByDate(today),
    listMetricsByDate(yesterday),
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

  const todayByOffer = groupByOffer(todayMetrics);

  const todayCard = {
    today: deriveFrom(todayMetrics),
    yesterday: yesterdayMetrics.length ? deriveFrom(yesterdayMetrics) : null,
  };

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
