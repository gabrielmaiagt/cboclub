"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";

import { changeCreativeStatusAction } from "@/app/actions/creatives";
import { EntityCode } from "@/components/shared/entity-code";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreativeFormSheet } from "@/features/creatives/components/creative-form-sheet";
import type {
  OfferOption,
  ScriptOption,
  UserOption,
} from "@/features/creatives/types";
import { canWrite } from "@/lib/auth/permissions";
import { dateTime, duration, EMPTY } from "@/lib/format";
import {
  CREATIVE_STATUS_LABELS,
  CREATIVE_STATUS_TONE,
  TONE_DOT,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  CREATIVE_STATUSES,
  type ActivityEntry,
  type AppRole,
  type Creative,
  type CreativeStatus,
  type Offer,
  type Script,
  type Taxonomy,
} from "@/types/domain";

interface CreativeDetailProps {
  creative: Creative;
  offer: Offer | null;
  script: Script | null;
  activity: ActivityEntry[];
  role: AppRole;
  offers: OfferOption[];
  scripts: ScriptOption[];
  users: UserOption[];
  taxonomy: Taxonomy;
}

export function CreativeDetail({
  creative,
  offer,
  script,
  activity,
  role,
  offers,
  scripts,
  users,
  taxonomy,
}: CreativeDetailProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editable = canWrite(role, "creative");

  const angle = offer?.angles.find((a) => a.id === creative.angleId);
  const editorName = users.find((u) => u.id === creative.editorId)?.name;
  const responsibleName = users.find(
    (u) => u.id === creative.responsibleId
  )?.name;
  const formatName =
    taxonomy.creativeFormats.find((f) => f.slug === creative.format)?.name ??
    creative.format;

  function handleStatusChange(status: CreativeStatus) {
    if (status === creative.status) return;
    startTransition(async () => {
      const result = await changeCreativeStatusAction({
        id: creative.id,
        status,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mudar o status.");
        return;
      }
      toast.success(`${creative.code} → ${CREATIVE_STATUS_LABELS[status]}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {creative.title}
            </h1>

            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={pending}
                  className="flex items-center gap-1 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
                  aria-label="Mudar status"
                >
                  <StatusBadge
                    label={CREATIVE_STATUS_LABELS[creative.status]}
                    tone={CREATIVE_STATUS_TONE[creative.status]}
                  />
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-80 overflow-y-auto"
                >
                  {CREATIVE_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onSelect={() => handleStatusChange(status)}
                      className={cn(status === creative.status && "bg-accent/50")}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          TONE_DOT[CREATIVE_STATUS_TONE[status]]
                        )}
                      />
                      {CREATIVE_STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <StatusBadge
                label={CREATIVE_STATUS_LABELS[creative.status]}
                tone={CREATIVE_STATUS_TONE[creative.status]}
              />
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <EntityCode code={creative.code} className="text-xs" />
            {offer && (
              <Link
                href={`/ofertas/${offer.code}`}
                className="hover:text-foreground hover:underline"
              >
                {offer.code} · {offer.name}
              </Link>
            )}
            {formatName && <span>{formatName}</span>}
            {creative.durationSeconds != null && (
              <span>{duration(creative.durationSeconds)}</span>
            )}
          </div>
        </div>

        {editable && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Ficha ────────────────────────────────────────────── */}
        <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4 lg:col-span-2">
          <Info label="Hook" value={creative.hook} />
          <Info label="Ângulo" value={angle?.name ?? null} />

          {/* Vinculo copy + versao especifica */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Copy usada
            </p>
            {script ? (
              <Link
                href={`/copies/${script.code}`}
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm hover:underline"
              >
                <EntityCode code={script.code} className="text-xs" />
                <span>{script.title}</span>
                {creative.scriptVersion != null && (
                  <span className="rounded bg-accent/60 px-1.5 py-0.5 text-[11px] font-medium">
                    V{creative.scriptVersion}
                  </span>
                )}
              </Link>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground/50">{EMPTY}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Info label="Editor" value={editorName ?? null} />
            <Info label="Responsável" value={responsibleName ?? null} />
          </div>

          {creative.tags.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                Tags
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {creative.tags.map((slug) => {
                  const tag = taxonomy.tags.find((t) => t.slug === slug);
                  return (
                    <span
                      key={slug}
                      className="rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag?.name ?? slug}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5 border-t border-border/40 pt-3">
            <LinkRow label="Arquivo" href={creative.sourceUrl} />
            <LinkRow label="Inspiração" href={creative.inspirationUrl} />
            {creative.storagePath && (
              <p className="text-xs text-muted-foreground">
                Storage:{" "}
                <span className="font-mono">{creative.storagePath}</span>
              </p>
            )}
          </div>

          {creative.notes && <Info label="Observações" value={creative.notes} />}

          <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <span>Editado: {creative.editedAt ? dateTime(creative.editedAt) : EMPTY}</span>
            <span>Aprovado: {creative.approvedAt ? dateTime(creative.approvedAt) : EMPTY}</span>
            <span>No ar: {creative.launchedAt ? dateTime(creative.launchedAt) : EMPTY}</span>
          </div>
        </div>

        {/* ── Timeline ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-3 text-sm font-medium">Histórico</p>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">
              Nenhum evento ainda.
            </p>
          ) : (
            <ol className="relative space-y-0 border-l border-border/60 pl-4">
              {activity.map((entry) => (
                <li key={entry.id} className="relative pb-3 last:pb-0">
                  <span className="absolute -left-[19px] top-1.5 size-1.5 rounded-full bg-border" />
                  <p className="text-xs">{entry.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {dateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <CreativeFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        creative={creative}
        offers={offers}
        scripts={scripts}
        users={users}
        taxonomy={taxonomy}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-0.5 text-sm">
        {value ?? <span className="text-muted-foreground/50">{EMPTY}</span>}
      </p>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string | null }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <ExternalLink className="size-3" />
      {label}:{" "}
      <span className="max-w-64 truncate underline decoration-border">
        {href}
      </span>
    </a>
  );
}
