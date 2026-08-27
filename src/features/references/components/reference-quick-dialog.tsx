"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createReferenceAction } from "@/app/actions/references";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Textarea } from "@/components/ui/textarea";
import type { MiningOption } from "@/features/references/types";
import { cn } from "@/lib/utils";

const NONE = "__none__";

/**
 * Quick capture (§9): salvar uma referencia em segundos.
 * Dois campos visiveis — link e "por que salvei". Transcricao e oferta
 * minerada ficam atras de "Mais detalhes"; todo o resto vem depois na
 * pagina da referencia.
 */
export function ReferenceQuickDialog({
  open,
  onOpenChange,
  miningItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  miningItems: MiningOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    url: "",
    whySaved: "",
    transcription: "",
    miningItemId: NONE,
  });

  useEffect(() => {
    if (!open) return;
    setForm({ url: "", whySaved: "", transcription: "", miningItemId: NONE });
    setShowMore(false);
    setError(null);
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createReferenceAction({
        url: form.url.trim(),
        whySaved: form.whySaved,
        transcription: form.transcription,
        miningItemId: form.miningItemId === NONE ? null : form.miningItemId,
        status: "salvo",
      });

      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar.");
        return;
      }

      const code = (result.data as { code: string } | undefined)?.code;
      toast.success(`${code ?? "Referência"} salva`);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar referência</DialogTitle>
          <DialogDescription>
            Cole o link e siga o seu dia. Detalhes podem vir depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className={cn(error && "text-destructive")}>
              Link do anúncio
            </Label>
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://facebook.com/ads/library/..."
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Por que salvei isso?</Label>
            <Textarea
              value={form.whySaved}
              onChange={(e) =>
                setForm((f) => ({ ...f, whySaved: e.target.value }))
              }
              placeholder="Hook forte de comparação de preço, rodando há 40 dias"
              rows={2}
            />
          </div>

          <Collapsible open={showMore} onOpenChange={setShowMore}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown
                className={cn("size-3.5 transition-transform", showMore && "rotate-180")}
              />
              Mais detalhes
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label>Transcrição (colada da ferramenta externa)</Label>
                <Textarea
                  value={form.transcription}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transcription: e.target.value }))
                  }
                  placeholder="Texto exatamente como veio do anúncio..."
                  rows={4}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Oferta minerada relacionada</Label>
                <Select
                  value={form.miningItemId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, miningItemId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {miningItems.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code} · {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
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
