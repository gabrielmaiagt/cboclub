import type { LedgerEntry, Partner, RecurringCost } from "@/types/domain";

export interface PartnerRow {
  partner: Partner;
  contributed: number;
  distributed: number;
  estimatedShare: number;
}

export interface FinanceData {
  canSeeExpenses: boolean;
  canSeeFull: boolean;
  cash: {
    contributions: number;
    distributions: number;
    revenueOther: number;
    expensesInPnl: number;
  } | null;
  company: { spend: number; revenue: number; refunds: number; gatewayFees: number } | null;
  expenses: LedgerEntry[];
  revenues: LedgerEntry[];
  contributions: LedgerEntry[];
  distributions: LedgerEntry[];
  partners: PartnerRow[];
  recurringCosts: RecurringCost[];
}
