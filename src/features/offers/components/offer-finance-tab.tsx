"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createExpenseAction } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { businessDate, EMPTY, fullDate, money } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/status";
import { EXPENSE_CATEGORIES, type LedgerEntry } from "@/types/domain";

/** Aba Financeiro da oferta: despesas alocadas a ela (§34). */
export function OfferFinanceTab({
  offerId,
  ledger,
  editable,
}: {
  offerId: string;
  ledger: LedgerEntry[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category: "freelancer",
    description: "",
  });

  const expenses = ledger.filter((e) => e.kind === "expense");
  const total = expenses
    .filter((e) => e.countsInPnl)
    .reduce((sum, e) => sum + e.amount, 0);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount.replace(",", "."));
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    startTransition(async () => {
      const result = await createExpenseAction({
        amount,
        category: form.category,
        date: businessDate(),
        description: form.description,
        offerId,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Despesa registrada");
      setOpen(false);
      setForm({ amount: "", category: "freelancer", description: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Despesas alocadas</p>
          <p className="tabular text-xl font-semibold">{money(total)}</p>
        </div>
        {editable && (
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Nova despesa
          </Button>
        )}
      </div>

      {expenses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma despesa alocada a esta oferta.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3.5 py-2.5 text-muted-foreground">{fullDate(e.date)}</td>
                  <td className="px-3.5 py-2.5">{e.description ?? EMPTY}</td>
                  <td className="px-3.5 py-2.5 text-muted-foreground">
                    {EXPENSE_CATEGORY_LABELS[e.category ?? ""] ?? e.category}
                  </td>
                  <td className="tabular px-3.5 py-2.5 text-right font-medium">
                    {money(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova despesa</DialogTitle>
            <DialogDescription>Registrada para hoje, alocada a esta oferta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="150,00"
                  inputMode="decimal"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {EXPENSE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Edição de 4 criativos"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
