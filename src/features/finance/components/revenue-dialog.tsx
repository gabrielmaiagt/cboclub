"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createRevenueAction } from "@/app/actions/finance";
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
import { businessDate } from "@/lib/format";

/** Receita fora do fluxo de oferta (§35). Venda de oferta nunca entra aqui. */
export function RevenueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ amount: "", description: "" });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount.replace(",", "."));
    if (!amount || amount <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    startTransition(async () => {
      const result = await createRevenueAction({
        amount,
        source: "outro",
        date: businessDate(),
        description: form.description,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Receita registrada");
      onOpenChange(false);
      setForm({ amount: "", description: "" });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova receita</DialogTitle>
          <DialogDescription>
            Só receita fora de oferta — vendas já entram pelas métricas diárias.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="800,00"
              inputMode="decimal"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Consultoria pontual"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
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
  );
}
