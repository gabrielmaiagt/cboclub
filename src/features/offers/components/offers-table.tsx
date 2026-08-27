"use client";

import Link from "next/link";

import { EntityCode } from "@/components/shared/entity-code";
import { HealthDot, StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OfferRow } from "@/features/offers/types";
import { EMPTY, money, multiplier, relativeDeadline } from "@/lib/format";
import {
  OFFER_HEALTH_LABELS,
  OFFER_HEALTH_TONE,
  OFFER_STATUS_TONE,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import { OFFER_STATUS_LABELS } from "@/types/domain";

/**
 * Tabela de ofertas (§6).
 *
 * Gasto, receita, ROAS e lucro sao de HOJE — o operador quer saber o que
 * esta acontecendo agora, nao o acumulado histórico. O acumulado aparece
 * na pagina da oferta.
 */
export function OffersTable({ rows }: { rows: OfferRow[] }) {
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhuma oferta neste filtro.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table className="table-dense">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[28%]">Oferta</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Gasto hoje</TableHead>
            <TableHead className="text-right">Receita hoje</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">Lucro</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead className="w-[20%]">Próxima ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ offer, responsibleName, today }) => {
            const noSpend = today.spend === 0;
            return (
              <TableRow key={offer.id} className="group">
                <TableCell>
                  <Link
                    href={`/ofertas/${offer.code}`}
                    className="flex items-center gap-2"
                  >
                    <HealthDot
                      tone={OFFER_HEALTH_TONE[offer.health]}
                      title={`Saúde: ${OFFER_HEALTH_LABELS[offer.health]}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:underline">
                        {offer.name}
                      </p>
                      <EntityCode code={offer.code} />
                    </div>
                  </Link>
                </TableCell>

                <TableCell>
                  <StatusBadge
                    label={OFFER_STATUS_LABELS[offer.status]}
                    tone={OFFER_STATUS_TONE[offer.status]}
                  />
                </TableCell>

                <TableCell className="tabular text-right text-sm">
                  {noSpend ? (
                    <span className="text-muted-foreground/50">{EMPTY}</span>
                  ) : (
                    money(today.spend)
                  )}
                </TableCell>

                <TableCell className="tabular text-right text-sm">
                  {noSpend && today.revenue === 0 ? (
                    <span className="text-muted-foreground/50">{EMPTY}</span>
                  ) : (
                    money(today.revenue)
                  )}
                </TableCell>

                <TableCell className="tabular text-right text-sm">
                  <span
                    className={cn(
                      today.roas != null && today.roas >= 1.5 && "text-status-win",
                      today.roas != null && today.roas < 1 && "text-status-danger"
                    )}
                  >
                    {multiplier(today.roas)}
                  </span>
                </TableCell>

                <TableCell className="tabular text-right text-sm">
                  {noSpend && today.revenue === 0 ? (
                    <span className="text-muted-foreground/50">{EMPTY}</span>
                  ) : (
                    <span
                      className={cn(
                        today.profit > 0 && "text-status-win",
                        today.profit < 0 && "text-status-danger"
                      )}
                    >
                      {money(today.profit)}
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {responsibleName ?? EMPTY}
                </TableCell>

                <TableCell>
                  {offer.nextAction ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm">{offer.nextAction}</p>
                      {offer.nextActionDue && (
                        <p
                          className={cn(
                            "text-xs",
                            (relativeDeadline(offer.nextActionDue).startsWith(
                              "Atrasado"
                            ) ||
                              relativeDeadline(offer.nextActionDue) === "Hoje") &&
                              "text-status-warn",
                            !relativeDeadline(offer.nextActionDue).startsWith(
                              "Atrasado"
                            ) && "text-muted-foreground"
                          )}
                        >
                          {relativeDeadline(offer.nextActionDue)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">
                      {EMPTY}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
