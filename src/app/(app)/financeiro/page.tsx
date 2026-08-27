import { FinanceView } from "@/features/finance/components/finance-view";
import { requireRead } from "@/lib/auth/guard";
import { canRead } from "@/lib/auth/permissions";
import {
  getCashSummary,
  listLedger,
  listPartners,
  listRecurringCosts,
} from "@/services/firestore/finance.repo";
import { aggregateCompanyMetrics } from "@/services/firestore/metrics.repo";

export const metadata = { title: "Financeiro" };
export const dynamic = "force-dynamic";

/**
 * Financeiro (§30-§38): simples e operacional, nunca contabil.
 * Trafego ve so despesas (precisa pra calcular ROI); o resto e admin.
 */
export default async function FinancePage() {
  const ctx = await requireRead("expenses");
  const canSeeFull = canRead(ctx.role, "finance");

  const [expenses, recurringCosts] = await Promise.all([
    listLedger({ kind: "expense", limit: 300 }),
    listRecurringCosts(),
  ]);

  let cash = null;
  let company = null;
  let revenues: Awaited<ReturnType<typeof listLedger>> = [];
  let contributions: Awaited<ReturnType<typeof listLedger>> = [];
  let distributions: Awaited<ReturnType<typeof listLedger>> = [];
  let partnerRows: import("@/features/finance/types").PartnerRow[] = [];

  if (canSeeFull) {
    const [cashSummary, companyMetrics, rev, contrib, dist, partners] =
      await Promise.all([
        getCashSummary(),
        aggregateCompanyMetrics(),
        listLedger({ kind: "revenue", limit: 200 }),
        listLedger({ kind: "contribution", limit: 200 }),
        listLedger({ kind: "distribution", limit: 200 }),
        listPartners(),
      ]);
    cash = cashSummary;
    company = companyMetrics;
    revenues = rev;
    contributions = contrib;
    distributions = dist;

    const lucroAcumulado =
      cashSummary.revenueOther +
      (companyMetrics.revenue - companyMetrics.refunds - companyMetrics.gatewayFees) -
      companyMetrics.spend -
      cashSummary.expensesInPnl;

    partnerRows = partners.map((p) => {
      const c = contrib
        .filter((e) => e.partnerId === p.id)
        .reduce((s, e) => s + e.amount, 0);
      const d = dist
        .filter((e) => e.partnerId === p.id)
        .reduce((s, e) => s + e.amount, 0);
      return {
        partner: p,
        contributed: c,
        distributed: d,
        estimatedShare: (lucroAcumulado * p.ownershipPercentage) / 100,
      };
    });
  }

  return (
    <FinanceView
      data={{
        canSeeExpenses: true,
        canSeeFull,
        cash,
        company,
        expenses,
        revenues,
        contributions,
        distributions,
        partners: partnerRows,
        recurringCosts,
      }}
    />
  );
}
