"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateMiningItemAction } from "@/app/actions/mining";
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
import { Textarea } from "@/components/ui/textarea";
import type { MiningItem } from "@/types/domain";

/** Detalhes opcionais (§18), preenchidos depois da captura rapida. */
export function MiningDetailsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MiningItem;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    niche: item.niche ?? "",
    country: item.country ?? "",
    targetAudience: item.targetAudience ?? "",
    promise: item.promise ?? "",
    mechanism: item.mechanism ?? "",
    price: item.price != null ? String(item.price) : "",
    advertiser: item.advertiser ?? "",
    score: item.score != null ? String(item.score) : "",
    notes: item.notes ?? "",
  });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset do formulario ao abrir, nao um loop
    setForm({
      niche: item.niche ?? "",
      country: item.country ?? "",
      targetAudience: item.targetAudience ?? "",
      promise: item.promise ?? "",
      mechanism: item.mechanism ?? "",
      price: item.price != null ? String(item.price) : "",
      advertiser: item.advertiser ?? "",
      score: item.score != null ? String(item.score) : "",
      notes: item.notes ?? "",
    });
  }, [open, item]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateMiningItemAction(item.id, {
        niche: form.niche,
        country: form.country,
        targetAudience: form.targetAudience,
        promise: form.promise,
        mechanism: form.mechanism,
        price: form.price ? Number(form.price.replace(",", ".")) : null,
        advertiser: form.advertiser,
        score: form.score ? Number(form.score) : null,
        notes: form.notes,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Detalhes salvos");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes de {item.code}</DialogTitle>
          <DialogDescription>Tudo aqui é opcional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nicho</Label>
              <Input value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} placeholder="BR" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Público</Label>
            <Input
              value={form.targetAudience}
              onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Promessa</Label>
            <Textarea value={form.promise} onChange={(e) => setForm((f) => ({ ...f, promise: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Mecanismo</Label>
            <Input value={form.mechanism} onChange={(e) => setForm((f) => ({ ...f, mechanism: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Preço (R$)</Label>
              <Input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label>Anunciante</Label>
              <Input value={form.advertiser} onChange={(e) => setForm((f) => ({ ...f, advertiser: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Score (1-5)</Label>
              <Input value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} inputMode="numeric" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
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
