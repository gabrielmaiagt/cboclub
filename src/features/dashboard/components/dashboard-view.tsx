"use client";

import Link from "next/link";
import { AlertTriangle, CircleAlert, Smartphone } from "lucide-react";

import { EntityCode } from "@/components/shared/entity-code";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  EMPTY,
  fullDate,
  money,
  multiplier,
  relativeDeadline,
  signedPercent,
} from "@/lib/format";
import { delta } from "@/lib/metrics";
import { OFFER_STATUS_TONE } from "@/lib/status";
import { cn } from "@/lib/utils";
import { OFFER_STATUS_LABELS } from "@/types/domain";
import type { DashboardData } from "@/features/dashboard/types";

interface DashboardViewProps {
  data: DashboardData;
  cash: Awaited<ReturnType<typeof import("@/services/firestore/finance.repo").getCashSummary>> | null;
  canSeeFinance: boolean;
  offerCount: number;
}

function StatCard({
  label,
  value,
  deltaValue,
}: {
  label: string;
  value: string;
  deltaValue?: number | null;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold leading-none">{value}</p>
      {deltaValue != null && (
        <p
          className={cn(
            "tabular mt-1.5 text-xs",
            deltaValue > 0 && "text-status-win",
            deltaValue < 0 && "text-status-danger",
            deltaValue === 0 && "text-muted-foreground"
          )}
        >
          {signedPercent(deltaValue)} vs. ontem
        </p>
      )}
    </div>
  );
}

export function DashboardView({
  data,
  cash,
  canSeeFinance,
  offerCount,
}: DashboardViewProps) {
  const { todayCard, running, launchQueue, chipCapacity, chipsTarget, decisions, myTasks, alerts } = data;
  const y = todayCard.yesterday;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        description={`${offerCount} ${offerCount === 1 ? "oferta" : "ofertas"} no sistema · ${running.length} rodando agora`}
      />

      {/* ── Hoje ────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">Hoje</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Gasto"
            value={money(todayCard.today.spend)}
            deltaValue={y ? delta(todayCard.today.spend, y.spend) : null}
          />
          <StatCard
            label="Receita"
            value={money(todayCard.today.revenue)}
            deltaValue={y ? delta(todayCard.today.revenue, y.revenue) : null}
          />
          <StatCard
            label="Lucro"
            value={money(todayCard.today.operationalProfit)}
            deltaValue={
              y ? delta(todayCard.today.operationalProfit, y.operationalProfit) : null
            }
          />
          <StatCard label="ROAS" value={multiplier(todayCard.today.roas)} />
          <StatCard
            label="Vendas"
            value={String(todayCard.today.sales)}
            deltaValue={y ? delta(todayCard.today.sales, y.sales) : null}
          />
          <StatCard label="CPA" value={money(todayCard.today.cpa)} />
        </div>
      </div>

      {/* ── Alertas ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">
            Precisa de atenção
          </h2>
          <div className="space-y-1.5">
            {alerts.slice(0, 6).map((alert) => {
              const Icon = alert.severity === "danger" ? CircleAlert : AlertTriangle;
              const inner = (
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
                    alert.severity === "danger"
                      ? "border-status-danger/30 bg-status-danger/5 text-status-danger"
                      : "border-status-warn/30 bg-status-warn/5 text-status-warn"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="text-foreground">{alert.message}</span>
                </div>
              );
              return alert.href ? (
                <Link key={alert.id} href={alert.href} className="block hover:opacity-80">
                  {inner}
                </Link>
              ) : (
                <div key={alert.id}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Ofertas rodando ───────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Rodando agora
            </h2>
            <Link href="/ofertas" className="text-xs text-muted-foreground hover:text-foreground">
              ver todas
            </Link>
          </div>
          {running.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma oferta testando ou escalando agora.
            </p>
          ) : (
            <div className="space-y-2">
              {running.map(({ offer, today }) => (
                <Link
                  key={offer.id}
                  href={`/ofertas/${offer.code}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5 transition-colors hover:border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{offer.name}</p>
                      <StatusBadge
                        label={OFFER_STATUS_LABELS[offer.status]}
                        tone={OFFER_STATUS_TONE[offer.status]}
                        dot={false}
                      />
                    </div>
                    {offer.nextAction && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {offer.nextAction}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-right text-sm">
                    <div>
                      <p className="tabular">{money(today.spend)}</p>
                      <p className="text-xs text-muted-foreground">gasto</p>
                    </div>
                    <div>
                      <p
                        className={cn(
                          "tabular",
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
                          "tabular",
                          today.operationalProfit > 0 && "text-status-win",
                          today.operationalProfit < 0 && "text-status-danger"
                        )}
                      >
                        {money(today.operationalProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground">lucro</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Coluna lateral: caixa + capacidade de chips ──────────── */}
        <div className="space-y-5">
          {canSeeFinance && cash && (
            <div className="rounded-lg border border-border/60 bg-card/40 p-4">
              <Link
                href="/financeiro"
                className="mb-2 block text-sm font-semibold hover:underline"
              >
                Caixa da operação
              </Link>
              <p className="tabular text-2xl font-semibold">
                {money(
                  cash.contributions -
                    cash.distributions +
                    cash.revenueOther -
                    cash.expensesInPnl
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aportado {money(cash.contributions)} · Distribuído {money(cash.distributions)}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <Link
              href="/chips"
              className="mb-2 flex items-center gap-1.5 text-sm font-semibold hover:underline"
            >
              <Smartphone className="size-4" />
              Chips — meta {chipsTarget}
            </Link>
            {chipCapacity ? (
              <>
                <p className="tabular text-2xl font-semibold">
                  {chipCapacity.total}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {chipsTarget}
                  </span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full bg-status-live"
                    style={{
                      width: `${Math.min(100, (chipCapacity.total / chipsTarget) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Ativos: {chipCapacity.ativo ?? 0}</span>
                  <span>Prontos: {chipCapacity.pronto ?? 0}</span>
                  <span>Aquecendo: {chipCapacity.aquecendo ?? 0}</span>
                  <span>Reserva: {chipCapacity.reserva ?? 0}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{EMPTY}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Fila de lancamento ──────────────────────────────────── */}
        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-muted-foreground">
            Próximas ofertas
          </h2>
          {launchQueue.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Nada em produção agora.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <tbody>
                  {launchQueue.map((offer) => (
                    <tr key={offer.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3.5 py-2.5">
                        <Link href={`/ofertas/${offer.code}`} className="hover:underline">
                          <span className="font-medium">{offer.name}</span>
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <EntityCode code={offer.code} />
                          <StatusBadge
                            label={OFFER_STATUS_LABELS[offer.status]}
                            tone={OFFER_STATUS_TONE[offer.status]}
                            dot={false}
                          />
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">
                        {offer.nextAction ?? EMPTY}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-xs text-muted-foreground">
                        {offer.nextActionDue ? relativeDeadline(offer.nextActionDue) : EMPTY}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Decisoes + meu dia ──────────────────────────────────── */}
        <div className="space-y-5">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Decisões pendentes
              </h2>
            </div>
            {decisions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma decisão aberta.
              </p>
            ) : (
              <div className="space-y-1.5">
                {decisions.slice(0, 4).map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5 text-sm"
                  >
                    {d.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Meu dia</h2>
              <Link href="/tarefas" className="text-xs text-muted-foreground hover:text-foreground">
                ver tudo
              </Link>
            </div>
            {myTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma tarefa pendente.
              </p>
            ) : (
              <div className="space-y-1.5">
                {myTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5 text-sm"
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t.deadline ? relativeDeadline(t.deadline) : fullDate(null)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
