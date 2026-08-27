"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { changeOfferStatusAction } from "@/app/actions/offers";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OFFER_STATUS_TONE, TONE_DOT } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  OFFER_STATUS_LABELS,
  OFFER_STATUSES,
  type Offer,
  type OfferStatus,
} from "@/types/domain";

/**
 * Badge de status que abre um menu para mover a oferta de etapa.
 * Mesma server action do Kanban: uma unica trilha de mudanca de status.
 */
export function OfferStatusMenu({
  offer,
  editable,
}: {
  offer: Offer;
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const badge = (
    <StatusBadge
      label={OFFER_STATUS_LABELS[offer.status]}
      tone={OFFER_STATUS_TONE[offer.status]}
    />
  );

  if (!editable) return badge;

  function handleSelect(status: OfferStatus) {
    if (status === offer.status) return;
    startTransition(async () => {
      const result = await changeOfferStatusAction({ id: offer.id, status });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mudar o status.");
        return;
      }
      toast.success(`${offer.code} → ${OFFER_STATUS_LABELS[status]}`);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="flex items-center gap-1 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
        aria-label="Mudar status"
      >
        {badge}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
        {OFFER_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => handleSelect(status)}
            className={cn(status === offer.status && "bg-accent/50")}
          >
            <span
              className={cn("size-2 rounded-full", TONE_DOT[OFFER_STATUS_TONE[status]])}
            />
            {OFFER_STATUS_LABELS[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
