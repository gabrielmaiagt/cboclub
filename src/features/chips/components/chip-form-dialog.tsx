"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createChipAction } from "@/app/actions/chips";
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
import type { UserOption } from "@/features/chips/types";
import { CHIP_STATUS_LABELS } from "@/lib/status";
import { CHIP_STATUSES } from "@/types/domain";

const NONE = "__none__";

/** Cadastro rapido (§41): numero + status + responsavel. So. */
export function ChipFormDialog({
  open,
  onOpenChange,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    phoneNumber: "",
    status: "novo",
    responsibleId: NONE,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createChipAction({
        phoneNumber: form.phoneNumber.trim(),
        status: form.status,
        responsibleId: form.responsibleId === NONE ? null : form.responsibleId,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success(`${(result.data as { code: string } | undefined)?.code ?? "Chip"} cadastrado`);
      onOpenChange(false);
      setForm({ phoneNumber: "", status: "novo", responsibleId: NONE });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar chip</DialogTitle>
          <DialogDescription>
            Datas de aquecimento e ativação são registradas automaticamente conforme o status mudar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder="+55 11 98001-0001"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHIP_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {CHIP_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select
                value={form.responsibleId}
                onValueChange={(v) => setForm((f) => ({ ...f, responsibleId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ninguém" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ninguém</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
