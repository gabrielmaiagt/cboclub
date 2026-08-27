"use server";

import { revalidatePath } from "next/cache";

import { AuthError, requireAuth, requireRead, requireWrite } from "@/lib/auth/guard";
import {
  contributionFormSchema,
  distributionFormSchema,
  expenseFormSchema,
  partnerFormSchema,
  recurringCostFormSchema,
  revenueFormSchema,
} from "@/lib/schemas/finance";
import {
  createContribution,
  createDistribution,
  createExpense,
  createPartner,
  createRecurringCost,
  createRevenue,
  getCashSummary,
  getPartnerTotals,
  listLedger,
  listPartners,
  listRecurringCosts,
  setRecurringCostActive,
} from "@/services/firestore/finance.repo";
import type { Actor } from "@/services/firestore/offers.repo";
import type { LedgerEntry, LedgerKind, Partner, RecurringCost, User } from "@/types/domain";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
}

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Erro inesperado." };
}

function actorFrom(ctx: { uid: string; user: User }): Actor {
  return { uid: ctx.uid, name: ctx.user.fullName || ctx.user.email };
}

function revalidate() {
  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function listLedgerAction(options: {
  kind?: LedgerKind;
  offerId?: string;
  partnerId?: string;
  from?: string;
  to?: string;
}): Promise<ActionResult<LedgerEntry[]>> {
  try {
    if (options.kind === "expense") await requireRead("expenses");
    else await requireRead("finance");
    return { ok: true, data: await listLedger(options) };
  } catch (error) {
    return fail(error);
  }
}

export async function getCashSummaryAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getCashSummary>>>
> {
  try {
    await requireRead("finance");
    return { ok: true, data: await getCashSummary() };
  } catch (error) {
    return fail(error);
  }
}

export async function createExpenseAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("finance");
    const parsed = expenseFormSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Confira os campos.",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    await createExpense(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createRevenueAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("finance");
    const parsed = revenueFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createRevenue(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createContributionAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("finance");
    const parsed = contributionFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createContribution(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createDistributionAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("finance");
    const parsed = distributionFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createDistribution(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function listPartnersAction(): Promise<ActionResult<Partner[]>> {
  try {
    await requireRead("finance");
    return { ok: true, data: await listPartners() };
  } catch (error) {
    return fail(error);
  }
}

export async function createPartnerAction(raw: unknown): Promise<ActionResult> {
  try {
    const ctx = await requireWrite("finance");
    const parsed = partnerFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createPartner(parsed.data, actorFrom(ctx));
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function getPartnerTotalsAction(
  partnerId: string
): Promise<ActionResult<{ contributed: number; distributed: number }>> {
  try {
    await requireRead("finance");
    return { ok: true, data: await getPartnerTotals(partnerId) };
  } catch (error) {
    return fail(error);
  }
}

export async function listRecurringCostsAction(): Promise<
  ActionResult<RecurringCost[]>
> {
  try {
    await requireAuth();
    return { ok: true, data: await listRecurringCosts() };
  } catch (error) {
    return fail(error);
  }
}

export async function createRecurringCostAction(raw: unknown): Promise<ActionResult> {
  try {
    await requireWrite("admin");
    const parsed = recurringCostFormSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Confira os campos." };
    await createRecurringCost(parsed.data);
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setRecurringCostActiveAction(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    await requireWrite("admin");
    await setRecurringCostActive(id, active);
    revalidate();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
