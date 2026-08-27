"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createDistributionAction } from "@/app/actions/finance";
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
import { businessDate } from "@/lib/format";

interface PartnerOption {
  id: string;
  name: string;
}

/** Distribuição (§37): NÃO é despesa operacional — movimento de capital. */
export function DistributionDialog({
  open,
  onOpenChange,
  partners,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ amount: "", partnerId: "" });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount.replace(",", "."));
    if (!amount || amount <= 0 || !form.partnerId) {
      toast.error("Informe sócio e valor.");
      return;
    }
    const today = businessDate();
    startTransition(async () => {
      const result = await createDistributionAction({
        amount,
        partnerId: form.partnerId,
        date: today,
        period: today.slice(0, 7),
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Distribuição registrada");
      onOpenChange(false);
      setForm({ amount: "", partnerId: "" });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova distribuição</DialogTitle>
          <DialogDescription>Movimento de capital — não conta como despesa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Sócio</Label>
            <Select value={form.partnerId} onValueChange={(v) => setForm((f) => ({ ...f, partnerId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o sócio" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="600,00"
              inputMode="decimal"
              required
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
