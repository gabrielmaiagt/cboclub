import { requireAuth } from "@/lib/auth/guard";
import { businessDate } from "@/lib/format";
import { OffersView } from "@/features/offers/components/offers-view";
import { listOffers } from "@/services/firestore/offers.repo";
import {
  groupByOffer,
  listMetricsByDate,
} from "@/services/firestore/metrics.repo";
import { listUsers } from "@/services/firestore/users.repo";
import { deriveFrom } from "@/lib/metrics";
import type { OfferRow } from "@/features/offers/types";

export const metadata = { title: "Ofertas" };
export const dynamic = "force-dynamic";

/**
 * Lista de ofertas.
 *
 * Server component: le direto do repositorio, sem passar por server
 * action. O guard roda aqui tambem — o layout ja checou, mas cada rota
 * que le dado valida por conta propria.
 *
 * Custo: 1 query de ofertas (dezenas) + 1 query das metricas de hoje
 * (uma por oferta ativa) + 1 de usuarios. O join e feito em memoria,
 * que e mais barato do que denormalizar nome de oferta em cada metrica.
 */
export default async function OffersPage() {
  const ctx = await requireAuth();

  const today = businessDate();
  const [offers, todayMetrics, users] = await Promise.all([
    listOffers(),
    listMetricsByDate(today),
    listUsers(),
  ]);

  const metricsByOffer = groupByOffer(todayMetrics);
  const userNames = new Map(users.map((u) => [u.id, u.fullName]));

  const rows: OfferRow[] = offers.map((offer) => {
    const todays = metricsByOffer.get(offer.id) ?? [];
    const derived = deriveFrom(todays);
    return {
      offer,
      responsibleName: offer.responsibleId
        ? (userNames.get(offer.responsibleId) ?? null)
        : null,
      today: {
        spend: derived.spend,
        revenue: derived.revenue,
        roas: derived.roas,
        profit: derived.operationalProfit,
        sales: derived.sales,
      },
    };
  });

  return (
    <OffersView
      rows={rows}
      role={ctx.role}
      users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName }))}
    />
  );
}
