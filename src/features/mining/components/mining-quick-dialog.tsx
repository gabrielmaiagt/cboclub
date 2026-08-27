"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createMiningItemAction } from "@/app/actions/mining";
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

/** Quick capture (§18): nome + link + por que chamou atenção. So. */
export function MiningQuickDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", url: "", whyInteresting: "" });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createMiningItemAction({
        name: form.name.trim(),
        url: form.url,
        whyInteresting: form.whyInteresting,
        status: "salva",
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success(`${(result.data as { code: string } | undefined)?.code ?? "Item"} salvo`);
      onOpenChange(false);
      setForm({ name: "", url: "", whyInteresting: "" });
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Salvar oferta minerada</DialogTitle>
          <DialogDescription>
            Nome e link em segundos. Promessa, preço e score entram depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da oferta</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Pulseira Magnética Terapêutica"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Link</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://facebook.com/ads/library/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Por que chamou sua atenção?</Label>
            <Textarea
              value={form.whyInteresting}
              onChange={(e) => setForm((f) => ({ ...f, whyInteresting: e.target.value }))}
              placeholder="Escala agressiva, checkout simples"
              rows={2}
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
