"use client";

import Link from "next/link";
import { Boxes, PenLine, Smartphone } from "lucide-react";

import { EntityCode } from "@/components/shared/entity-code";
import { HealthDot, StatusBadge } from "@/components/shared/status-badge";
import type { OfferRow } from "@/features/offers/types";
import { EMPTY, money, multiplier } from "@/lib/format";
import {
  OFFER_HEALTH_LABELS,
  OFFER_HEALTH_TONE,
  OFFER_STATUS_TONE,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import { OFFER_STATUS_LABELS } from "@/types/domain";

/**
 * Card horizontal de oferta (§8) — a visao default da listagem.
 * O card inteiro e clicavel e leva ao workspace da oferta.
 */
export function OfferCard({ row }: { row: OfferRow }) {
  const { offer, responsibleName, today, counts } = row;
  const hasActivity = today.spend > 0 || today.revenue > 0;

  return (
    <Link
      href={`/ofertas/${offer.code}`}
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 transition-colors hover:border-border sm:flex-row sm:items-center sm:gap-5"
    >
      {/* Identidade */}
      <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:w-56 sm:shrink-0">
        <HealthDot
          tone={OFFER_HEALTH_TONE[offer.health]}
          title={`Saúde: ${OFFER_HEALTH_LABELS[offer.health]}`}
          className="mt-1.5"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{offer.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusBadge
              label={OFFER_STATUS_LABELS[offer.status]}
              tone={OFFER_STATUS_TONE[offer.status]}
              dot={false}
            />
            {responsibleName && (
              <span className="truncate text-xs text-muted-foreground">
                {responsibleName}
              </span>
            )}
          </div>
          <EntityCode code={offer.code} className="mt-1 block" />
        </div>
      </div>

      {/* Hoje */}
      <div className="flex shrink-0 items-center gap-4 border-t border-border/40 pt-3 sm:w-64 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        {hasActivity ? (
          <>
            <div>
              <p className="tabular text-sm font-medium">{money(today.spend)}</p>
              <p className="text-xs text-muted-foreground">gasto</p>
            </div>
            <div>
              <p className="tabular text-sm font-medium">{money(today.revenue)}</p>
              <p className="text-xs text-muted-foreground">receita</p>
            </div>
            <div>
              <p
                className={cn(
                  "tabular text-sm font-medium",
                  today.roas != null && today.roas >= 1.5 && "text-status-win",
                  today.roas != null && today.roas < 1 && "text-status-danger"
                )}
              >
                {multiplier(today.roas)}
              </p>
              <p className="text-xs text-muted-foreground">roas</p>
            </div>
            <div>
              <p
                className={cn(
                  "tabular text-sm font-medium",
                  today.profit > 0 && "text-status-win",
                  today.profit < 0 && "text-status-danger"
                )}
              >
                {money(today.profit)}
              </p>
              <p className="text-xs text-muted-foreground">lucro</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground/60">Sem gasto hoje</p>
        )}
      </div>

      {/* Producao */}
      <div className="flex shrink-0 items-center gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground sm:w-32 sm:flex-col sm:items-start sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <span className="flex items-center gap-1">
          <Boxes className="size-3.5" />
          {counts.creatives}
        </span>
        <span className="flex items-center gap-1">
          <PenLine className="size-3.5" />
          {counts.copies}
        </span>
        <span className="flex items-center gap-1">
          <Smartphone className="size-3.5" />
          {counts.chips}
        </span>
      </div>

      {/* Proxima acao */}
      <div className="min-w-0 shrink-0 border-t border-border/40 pt-3 sm:w-48 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        <p className="text-xs text-muted-foreground">Próxima ação</p>
        <p className="truncate text-sm">{offer.nextAction ?? EMPTY}</p>
      </div>
    </Link>
  );
}
