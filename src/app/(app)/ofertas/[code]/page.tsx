import { notFound } from "next/navigation";

import { OfferDetail } from "@/features/offers/components/offer-detail";
import { requireAuth } from "@/lib/auth/guard";
import { deriveFrom } from "@/lib/metrics";
import { derive } from "@/lib/metrics";
import { listActivityByOffer } from "@/services/firestore/activity.repo";
import { listCreatives } from "@/services/firestore/creatives.repo";
import {
  aggregateOfferTotals,
  listMetricsByOffer,
} from "@/services/firestore/metrics.repo";
import { getOfferByCode } from "@/services/firestore/offers.repo";
import { listScripts } from "@/services/firestore/scripts.repo";
import { getTaxonomy } from "@/services/firestore/settings.repo";
import { listUsers } from "@/services/firestore/users.repo";
import { businessDate, shiftDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

/**
 * Pagina interna da oferta (§12).
 *
 * Custo por visita: 1 doc da oferta + 2 aggregation queries (totais) +
 * 1 query dos ultimos 30 dias (graficos) + 1 da timeline + 1 de usuarios.
 * Os embutidos (angulos, paginas, campanhas) vieram gratis no doc.
 */
export default async function OfferDetailPage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { code } = await params;

  const offer = await getOfferByCode(code);
  if (!offer) notFound();

  const today = businessDate();
  const [totals, series, activity, users, scripts, creatives, taxonomy] =
    await Promise.all([
      aggregateOfferTotals(offer.id),
      listMetricsByOffer(offer.id, { from: shiftDate(today, -29), to: today }),
      listActivityByOffer(offer.id),
      listUsers(),
      listScripts({ offerId: offer.id }),
      listCreatives({ offerId: offer.id }),
      getTaxonomy(),
    ]);

  // Totais acumulados: o servidor somou, a aplicacao deriva (§33)
  const lifetime = derive({
    spend: totals.spend,
    impressions: totals.impressions,
    clicks: totals.clicks,
    leads: totals.leads,
    sales: totals.sales,
    revenue: totals.revenue,
    refunds: totals.refunds,
    gatewayFees: totals.gatewayFees,
    additionalCosts: totals.additionalCosts,
  });

  const todayDerived = deriveFrom(series.filter((m) => m.date === today));

  return (
    <OfferDetail
      offer={offer}
      lifetime={lifetime}
      today={todayDerived}
      series={series.map((m) => ({
        date: m.date,
        spend: m.spend,
        revenue: m.revenue,
        roas: m.spend > 0 ? m.revenue / m.spend : null,
      }))}
      activity={activity}
      role={ctx.role}
      users={users
        .filter((u) => u.active)
        .map((u) => ({ id: u.id, name: u.fullName }))}
      scripts={scripts.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        status: s.status,
        currentVersion: s.currentVersion,
        wordCount: s.current.wordCount,
        estimatedDurationSeconds: s.current.estimatedDurationSeconds,
      }))}
      creatives={creatives.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        status: c.status,
        format: c.format,
        scriptVersion: c.scriptVersion,
      }))}
      taxonomy={taxonomy}
    />
  );
}
