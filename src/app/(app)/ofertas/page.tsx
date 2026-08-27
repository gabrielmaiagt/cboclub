import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { requireAuth } from "@/lib/auth/guard";
import { businessDate } from "@/lib/format";
import { OffersView } from "@/features/offers/components/offers-view";
import { listOffers } from "@/services/firestore/offers.repo";
import { listChips } from "@/services/firestore/chips.repo";
import { listCreatives } from "@/services/firestore/creatives.repo";
import { listScripts } from "@/services/firestore/scripts.repo";
import {
  groupByOffer,
  listMetricsByDate,
} from "@/services/firestore/metrics.repo";
import { listUsers } from "@/services/firestore/users.repo";
import { deriveFrom } from "@/lib/metrics";
import type { OfferRow } from "@/features/offers/types";
import type { AppRole } from "@/types/domain";

export const metadata = { title: "Ofertas" };
export const dynamic = "force-dynamic";

function countBy<T>(items: T[], key: (item: T) => string | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

/**
 * Lista de ofertas (§8): cards horizontais por padrão.
 *
 * Custo: ofertas + metricas de hoje + usuarios + criativos/copies/chips
 * (para as contagens do card) — tudo pequeno, uma query cada, sem N+1.
 */
export default async function OffersPage() {
  const ctx = await requireAuth();

  return (
    <Suspense fallback={<PageSkeleton />}>
      <OffersContent role={ctx.role} />
    </Suspense>
  );
}

async function OffersContent({ role }: { role: AppRole }) {
  const today = businessDate();
  const [offers, todayMetrics, users, creatives, scripts, chips] =
    await Promise.all([
      listOffers(),
      listMetricsByDate(today),
      listUsers(),
      listCreatives(),
      listScripts(),
      listChips(),
    ]);

  const metricsByOffer = groupByOffer(todayMetrics);
  const userNames = new Map(users.map((u) => [u.id, u.fullName]));
  const creativeCounts = countBy(creatives, (c) => c.offerId);
  const scriptCounts = countBy(scripts, (s) => s.offerId);
  const chipCounts = countBy(chips, (c) => c.currentOfferId);

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
      counts: {
        creatives: creativeCounts.get(offer.id) ?? 0,
        copies: scriptCounts.get(offer.id) ?? 0,
        chips: chipCounts.get(offer.id) ?? 0,
      },
    };
  });

  return (
    <OffersView
      rows={rows}
      role={role}
      users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName }))}
    />
  );
}
