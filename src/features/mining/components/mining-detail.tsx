"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ExternalLink, Loader2, Pencil, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { changeMiningStatusAction, convertMiningToOfferAction } from "@/app/actions/mining";
import { EntityCode } from "@/components/shared/entity-code";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MiningDetailsDialog } from "@/features/mining/components/mining-details-dialog";
import { canWrite } from "@/lib/auth/permissions";
import { EMPTY, money } from "@/lib/format";
import { MINING_STATUS_LABELS, MINING_STATUS_TONE, REFERENCE_STATUS_LABELS, REFERENCE_STATUS_TONE, TONE_DOT } from "@/lib/status";
import { cn } from "@/lib/utils";
import { MINING_STATUSES, type AppRole, type CreativeReference, type MiningItem } from "@/types/domain";

interface OfferSummary {
  code: string;
  name: string;
}

export function MiningDetail({
  item,
  references,
  convertedOffer,
  role,
}: {
  item: MiningItem;
  references: CreativeReference[];
  convertedOffer: OfferSummary | null;
  role: AppRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [ticketPrice, setTicketPrice] = useState(item.price ? String(item.price) : "");
  const editable = canWrite(role, "traffic");

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await changeMiningStatusAction({ id: item.id, status });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mudar o status.");
        return;
      }
      toast.success(`${item.code} → ${MINING_STATUS_LABELS[status as keyof typeof MINING_STATUS_LABELS]}`);
      router.refresh();
    });
  }

  function handleConvert() {
    startTransition(async () => {
      const result = await convertMiningToOfferAction({
        id: item.id,
        ticketPrice: ticketPrice ? Number(ticketPrice.replace(",", ".")) : null,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível transformar em oferta.");
        return;
      }
      const offerCode = (result.data as { offerCode: string }).offerCode;
      toast.success(`${offerCode} criada a partir de ${item.code}`);
      setConvertOpen(false);
      router.push(`/ofertas/${offerCode}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{item.name}</h1>
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={pending}
                  className="flex items-center gap-1 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <StatusBadge label={MINING_STATUS_LABELS[item.status]} tone={MINING_STATUS_TONE[item.status]} />
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {MINING_STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => handleStatusChange(s)}
                      className={cn(s === item.status && "bg-accent/50")}
                    >
                      <span className={cn("size-2 rounded-full", TONE_DOT[MINING_STATUS_TONE[s]])} />
                      {MINING_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <StatusBadge label={MINING_STATUS_LABELS[item.status]} tone={MINING_STATUS_TONE[item.status]} />
            )}
          </div>
          <EntityCode code={item.code} className="mt-1 block text-xs" />
        </div>

        {editable && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setDetailsOpen(true)} className="gap-1.5">
              <Pencil className="size-3.5" />
              Detalhes
            </Button>
            {!convertedOffer && (
              <Button size="sm" onClick={() => setConvertOpen(true)} className="gap-1.5">
                <Wand2 className="size-3.5" />
                Transformar em oferta
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4 lg:col-span-2">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              <span className="truncate underline decoration-border">{item.url}</span>
            </a>
          )}

          {item.whyInteresting && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Por que chamou atenção
              </p>
              <p className="mt-0.5 text-sm">{item.whyInteresting}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 text-sm sm:grid-cols-3">
            <Info label="Nicho" value={item.niche} />
            <Info label="País" value={item.country} />
            <Info label="Anunciante" value={item.advertiser} />
            <Info label="Preço" value={item.price != null ? money(item.price) : null} />
            <Info label="Score" value={item.score != null ? `${item.score}/5` : null} />
            <Info label="Público" value={item.targetAudience} />
          </div>

          {item.promise && (
            <div className="border-t border-border/40 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Promessa</p>
              <p className="mt-0.5 text-sm">{item.promise}</p>
            </div>
          )}
          {item.mechanism && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mecanismo</p>
              <p className="mt-0.5 text-sm">{item.mechanism}</p>
            </div>
          )}
          {item.notes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observações</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Modelagem: oferta interna originada daqui */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Modelagem
          </p>
          {convertedOffer ? (
            <Link href={`/ofertas/${convertedOffer.code}`} className="flex items-center gap-2 text-sm hover:underline">
              <EntityCode code={convertedOffer.code} className="text-xs" />
              {convertedOffer.name}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground/60">
              Ainda não virou oferta interna.
            </p>
          )}
        </div>
      </div>

      {/* Dossie: criativos de referencia relacionados (§19) */}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold">
          Criativos encontrados {references.length > 0 && `(${references.length})`}
        </h3>
        {references.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum criativo de referência vinculado a esta oferta ainda.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {references.map((ref) => (
              <Link
                key={ref.id}
                href={`/referencias/${ref.code}`}
                className="rounded-lg border border-border/60 bg-card/40 p-3.5 transition-colors hover:border-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <EntityCode code={ref.code} />
                  <StatusBadge
                    label={REFERENCE_STATUS_LABELS[ref.status]}
                    tone={REFERENCE_STATUS_TONE[ref.status]}
                    dot={false}
                  />
                </div>
                {ref.whySaved && <p className="mt-2 line-clamp-2 text-sm">{ref.whySaved}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>

      <MiningDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} item={item} />

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transformar em oferta</DialogTitle>
            <DialogDescription>
              Cria uma oferta interna com os dados já preenchidos. A mineração continua aqui, marcada como modelada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Ticket (R$)</Label>
            <Input
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value)}
              placeholder={item.price ? String(item.price) : "39,90"}
              inputMode="decimal"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConvertOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={handleConvert} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Criar oferta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value ?? <span className="text-muted-foreground/50">{EMPTY}</span>}</p>
    </div>
  );
}
