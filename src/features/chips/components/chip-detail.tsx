"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { changeChipStatusAction, setChipOfferAction } from "@/app/actions/chips";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OfferOption, UserOption } from "@/features/chips/types";
import { canWrite } from "@/lib/auth/permissions";
import { dateTime, EMPTY, fullDate } from "@/lib/format";
import { CHIP_STATUS_LABELS, CHIP_STATUS_TONE, TONE_DOT } from "@/lib/status";
import { cn } from "@/lib/utils";
import { CHIP_STATUSES, type AppRole, type Chip, type ChipEvent } from "@/types/domain";

const NONE = "__none__";

export function ChipDetail({
  chip,
  events,
  offers,
  users,
  role,
  phoneNumber,
  canSeePhone,
}: {
  chip: Chip;
  events: ChipEvent[];
  offers: OfferOption[];
  users: UserOption[];
  role: AppRole;
  phoneNumber: string | null;
  canSeePhone: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(false);
  const editable = canWrite(role, "ops");
  const responsibleName = users.find((u) => u.id === chip.responsibleId)?.name;
  const currentOffer = offers.find((o) => o.id === chip.currentOfferId);

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await changeChipStatusAction({ id: chip.id, status });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mudar o status.");
        return;
      }
      toast.success(`${chip.code} → ${CHIP_STATUS_LABELS[status as keyof typeof CHIP_STATUS_LABELS]}`);
      router.refresh();
    });
  }

  function handleOfferChange(offerId: string) {
    startTransition(async () => {
      const result = await setChipOfferAction({
        id: chip.id,
        offerId: offerId === NONE ? null : offerId,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível vincular.");
        return;
      }
      toast.success("Atualizado");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{chip.code}</h1>
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={pending}
                  className="flex items-center gap-1 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <StatusBadge label={CHIP_STATUS_LABELS[chip.status]} tone={CHIP_STATUS_TONE[chip.status]} />
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {CHIP_STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => handleStatusChange(s)}
                      className={cn(s === chip.status && "bg-accent/50")}
                    >
                      <span className={cn("size-2 rounded-full", TONE_DOT[CHIP_STATUS_TONE[s]])} />
                      {CHIP_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <StatusBadge label={CHIP_STATUS_LABELS[chip.status]} tone={CHIP_STATUS_TONE[chip.status]} />
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {chip.operator ?? "Operadora não informada"}
            {responsibleName && ` · ${responsibleName}`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4 lg:col-span-2">
          {canSeePhone && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Número</p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="font-mono text-sm">
                  {revealed ? (phoneNumber ?? EMPTY) : (chip.maskedNumber ?? EMPTY)}
                </p>
                <button
                  onClick={() => setRevealed((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                  title={revealed ? "Ocultar" : "Mostrar número"}
                >
                  {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Oferta atual</p>
            {editable ? (
              <Select value={chip.currentOfferId ?? NONE} onValueChange={handleOfferChange}>
                <SelectTrigger className="mt-1 w-64">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {offers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.code} · {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : currentOffer ? (
              <Link href={`/ofertas/${currentOffer.code}`} className="mt-0.5 block text-sm hover:underline">
                {currentOffer.code} · {currentOffer.name}
              </Link>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">{EMPTY}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Adquirido</p>
              <p>{chip.acquisitionDate ? fullDate(chip.acquisitionDate) : EMPTY}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aquecimento</p>
              <p>{chip.warmupStartDate ? fullDate(chip.warmupStartDate) : EMPTY}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ficou pronto</p>
              <p>{chip.readyDate ? fullDate(chip.readyDate) : EMPTY}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ativado</p>
              <p>{chip.activationDate ? fullDate(chip.activationDate) : EMPTY}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-3 text-sm font-medium">Histórico</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">Nenhum evento.</p>
          ) : (
            <ol className="relative space-y-0 border-l border-border/60 pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative pb-3 last:pb-0">
                  <span className="absolute -left-[19px] top-1.5 size-1.5 rounded-full bg-border" />
                  <p className="text-xs">{e.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{dateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

    </div>
  );
}
