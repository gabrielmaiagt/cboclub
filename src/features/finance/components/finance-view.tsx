"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "@/features/finance/components/expense-dialog";
import { RevenueDialog } from "@/features/finance/components/revenue-dialog";
import { ContributionDialog } from "@/features/finance/components/contribution-dialog";
import { DistributionDialog } from "@/features/finance/components/distribution-dialog";
import { PartnerDialog } from "@/features/finance/components/partner-dialog";
import { RecurringCostDialog } from "@/features/finance/components/recurring-cost-dialog";
import type { FinanceData } from "@/features/finance/types";
import { EMPTY, fullDate, money, percent } from "@/lib/format";
import { operationalProfit, roi as calcRoi, totalCost } from "@/lib/metrics";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";

type Tab = "visao" | "despesas" | "receitas" | "socios" | "recorrentes";

function StatCard({ label, value, accent }: { label: string; value: string; accent?: "win" | "danger" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-xl font-semibold leading-none",
          accent === "win" && "text-status-win",
          accent === "danger" && "text-status-danger"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function FinanceView({ data }: { data: FinanceData }) {
  const [tab, setTab] = useState<Tab>(data.canSeeFull ? "visao" : "despesas");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [distributionOpen, setDistributionOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const tabs: { key: Tab; label: string }[] = [
    ...(data.canSeeFull ? [{ key: "visao" as Tab, label: "Visão Geral" }] : []),
    { key: "despesas", label: "Despesas" },
    ...(data.canSeeFull
      ? [
          { key: "receitas" as Tab, label: "Receitas & Sócios" },
          { key: "socios" as Tab, label: "Sócios" },
        ]
      : []),
    { key: "recorrentes", label: "Custos recorrentes" },
  ];

  let base = null;
  let caixa = 0;
  let lucro = 0;
  if (data.cash && data.company) {
    base = {
      spend: data.company.spend,
      revenue: data.company.revenue,
      refunds: data.company.refunds,
      gatewayFees: data.company.gatewayFees,
      additionalCosts: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      sales: 0,
    };
    const opProfit = operationalProfit(base) + data.cash.revenueOther - data.cash.expensesInPnl;
    lucro = opProfit;
    caixa = data.cash.contributions - data.cash.distributions + opProfit;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description="Caixa, receitas, despesas, aportes e distribuições — simples, não contábil."
        action={
          tab === "despesas" ? (
            <Button onClick={() => setExpenseOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Nova despesa
            </Button>
          ) : tab === "recorrentes" && data.canSeeFull ? (
            <Button onClick={() => setRecurringOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Novo custo recorrente
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex h-8 items-center rounded-md px-3 text-sm transition-colors",
              tab === t.key
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "visao" && data.cash && data.company && base && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard label="Caixa" value={money(caixa)} accent={caixa >= 0 ? "win" : "danger"} />
            <StatCard label="Investimento em tráfego" value={money(data.company.spend)} />
            <StatCard label="Receita de ofertas" value={money(data.company.revenue)} />
            <StatCard label="Lucro operacional" value={money(lucro)} accent={lucro >= 0 ? "win" : "danger"} />
            <StatCard label="ROI" value={percent(calcRoi({ ...base, additionalCosts: totalCost(base) - base.spend }))} />
            <StatCard label="Total aportado" value={money(data.cash.contributions)} />
            <StatCard label="Total distribuído" value={money(data.cash.distributions)} />
            <StatCard label="Outras receitas" value={money(data.cash.revenueOther)} />
          </div>
        </div>
      )}

      {tab === "despesas" && (
        <div className="overflow-hidden rounded-lg border border-border/60">
          {data.expenses.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma despesa registrada ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3.5 py-2.5 text-muted-foreground">{fullDate(e.date)}</td>
                    <td className="px-3.5 py-2.5">{e.description ?? EMPTY}</td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">
                      {EXPENSE_CATEGORY_LABELS[e.category ?? ""] ?? e.category}
                      {!e.countsInPnl && (
                        <span className="ml-1.5 text-xs">(já contado via tráfego)</span>
                      )}
                    </td>
                    <td className="tabular px-3.5 py-2.5 text-right font-medium">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "receitas" && data.canSeeFull && (
        <div className="space-y-6">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Receitas fora de oferta</h3>
              <Button size="sm" variant="outline" onClick={() => setRevenueOpen(true)} className="gap-1.5">
                <Plus className="size-3.5" />
                Nova receita
              </Button>
            </div>
            {data.revenues.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhuma receita fora de oferta.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <tbody>
                    {data.revenues.map((r) => (
                      <tr key={r.id} className="border-b border-border/40 last:border-0">
                        <td className="px-3.5 py-2.5 text-muted-foreground">{fullDate(r.date)}</td>
                        <td className="px-3.5 py-2.5">{r.description ?? EMPTY}</td>
                        <td className="tabular px-3.5 py-2.5 text-right font-medium">{money(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Aportes</h3>
                <Button size="sm" variant="outline" onClick={() => setContributionOpen(true)} className="gap-1.5">
                  <Plus className="size-3.5" />
                  Novo aporte
                </Button>
              </div>
              <div className="space-y-1.5">
                {data.contributions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum aporte registrado.
                  </p>
                ) : (
                  data.contributions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5 text-sm">
                      <span className="text-muted-foreground">{fullDate(c.date)}</span>
                      <span className="tabular font-medium">{money(c.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Distribuições</h3>
                <Button size="sm" variant="outline" onClick={() => setDistributionOpen(true)} className="gap-1.5">
                  <Plus className="size-3.5" />
                  Nova distribuição
                </Button>
              </div>
              <div className="space-y-1.5">
                {data.distributions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhuma distribuição registrada.
                  </p>
                ) : (
                  data.distributions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5 text-sm">
                      <span className="text-muted-foreground">{fullDate(d.date)}</span>
                      <span className="tabular font-medium">{money(d.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "socios" && data.canSeeFull && (
        <div className="space-y-4">
          <Button size="sm" onClick={() => setPartnerOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            Novo sócio
          </Button>
          {data.partners.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum sócio cadastrado.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.partners.map((row) => (
                <div key={row.partner.id} className="rounded-lg border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{row.partner.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {row.partner.ownershipPercentage}%
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="tabular text-sm font-medium text-foreground">
                        {money(row.contributed)}
                      </p>
                      <p>aportado</p>
                    </div>
                    <div>
                      <p className="tabular text-sm font-medium text-foreground">
                        {money(row.distributed)}
                      </p>
                      <p>distribuído</p>
                    </div>
                    <div>
                      <p className="tabular text-sm font-medium text-status-win">
                        {money(row.estimatedShare)}
                      </p>
                      <p>estimativa disponível</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Estimativa apenas — a distribuição real precisa ser registrada manualmente.
          </p>
        </div>
      )}

      {tab === "recorrentes" && (
        <div className="space-y-4">
          {data.recurringCosts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum custo recorrente cadastrado.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-border/60 bg-card/40 p-4">
                <p className="text-xs text-muted-foreground">Previsão mensal</p>
                <p className="tabular text-xl font-semibold">
                  {money(
                    data.recurringCosts
                      .filter((c) => c.active)
                      .reduce((s, c) => s + (c.frequency === "anual" ? c.amount / 12 : c.amount), 0)
                  )}
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <tbody>
                    {data.recurringCosts.map((c) => (
                      <tr key={c.id} className="border-b border-border/40 last:border-0">
                        <td className="px-3.5 py-2.5 font-medium">{c.name}</td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">
                          {c.frequency === "anual" ? "anual" : "mensal"}
                        </td>
                        <td className="px-3.5 py-2.5 text-muted-foreground">
                          {c.nextChargeDate ? fullDate(c.nextChargeDate) : EMPTY}
                        </td>
                        <td className="tabular px-3.5 py-2.5 text-right font-medium">
                          {money(c.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      {data.canSeeFull && (
        <>
          <RevenueDialog open={revenueOpen} onOpenChange={setRevenueOpen} />
          <ContributionDialog
            open={contributionOpen}
            onOpenChange={setContributionOpen}
            partners={data.partners.map((p) => ({ id: p.partner.id, name: p.partner.name }))}
          />
          <DistributionDialog
            open={distributionOpen}
            onOpenChange={setDistributionOpen}
            partners={data.partners.map((p) => ({ id: p.partner.id, name: p.partner.name }))}
          />
          <PartnerDialog open={partnerOpen} onOpenChange={setPartnerOpen} />
          <RecurringCostDialog open={recurringOpen} onOpenChange={setRecurringOpen} />
        </>
      )}
    </div>
  );
}
