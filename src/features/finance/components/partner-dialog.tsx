"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createPartnerAction } from "@/app/actions/finance";
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

export function PartnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", ownershipPercentage: "" });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createPartnerAction({
        name: form.name.trim(),
        ownershipPercentage: Number(form.ownershipPercentage.replace(",", ".")) || 0,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Sócio adicionado");
      onOpenChange(false);
      setForm({ name: "", ownershipPercentage: "" });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo sócio</DialogTitle>
          <DialogDescription>A distribuição continua sendo manual.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome do sócio"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Participação (%)</Label>
            <Input
              value={form.ownershipPercentage}
              onChange={(e) => setForm((f) => ({ ...f, ownershipPercentage: e.target.value }))}
              placeholder="50"
              inputMode="decimal"
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
