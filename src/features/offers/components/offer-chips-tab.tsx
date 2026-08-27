"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Link2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";

import { setChipOfferAction } from "@/app/actions/chips";
import { EntityCode } from "@/components/shared/entity-code";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHIP_STATUS_LABELS, CHIP_STATUS_TONE } from "@/lib/status";
import type { Chip } from "@/types/domain";

/**
 * Aba Chips da oferta (§42): quais chips estao nesta oferta, com atalho
 * para vincular um chip disponivel sem sair da tela.
 */
export function OfferChipsTab({
  offerId,
  chipsLinked,
  chipsAvailable,
  editable,
}: {
  offerId: string;
  chipsLinked: Chip[];
  chipsAvailable: Chip[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  function linkChip() {
    if (!selected) return;
    startTransition(async () => {
      const result = await setChipOfferAction({ id: selected, offerId });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível vincular.");
        return;
      }
      toast.success("Chip vinculado");
      setSelected("");
      router.refresh();
    });
  }

  function unlinkChip(chipId: string) {
    startTransition(async () => {
      const result = await setChipOfferAction({ id: chipId, offerId: null });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível desvincular.");
        return;
      }
      toast.success("Chip desvinculado");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex items-center gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Escolha um chip disponível" />
            </SelectTrigger>
            <SelectContent>
              {chipsAvailable.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} · {CHIP_STATUS_LABELS[c.status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={linkChip} disabled={!selected || pending} className="gap-1.5">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
            Vincular
          </Button>
        </div>
      )}

      {chipsLinked.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum chip vinculado a esta oferta ainda.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chipsLinked.map((chip) => (
            <div
              key={chip.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3.5"
            >
              <div className="min-w-0">
                <Link href={`/chips/${chip.code}`} className="hover:underline">
                  <EntityCode code={chip.code} />
                </Link>
                <div className="mt-1">
                  <StatusBadge
                    label={CHIP_STATUS_LABELS[chip.status]}
                    tone={CHIP_STATUS_TONE[chip.status]}
                    dot={false}
                  />
                </div>
              </div>
              {editable && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => unlinkChip(chip.id)}
                  disabled={pending}
                  title="Desvincular"
                >
                  <Unlink className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
