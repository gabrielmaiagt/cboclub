"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookMarked, ExternalLink, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { EntityCode } from "@/components/shared/entity-code";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ReferenceQuickDialog } from "@/features/references/components/reference-quick-dialog";
import type { MiningOption, ReferenceRow } from "@/features/references/types";
import { canWrite } from "@/lib/auth/permissions";
import { dateTime } from "@/lib/format";
import { REFERENCE_STATUS_LABELS, REFERENCE_STATUS_TONE } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  REFERENCE_STATUSES,
  type AppRole,
  type ReferenceStatus,
} from "@/types/domain";

export function ReferencesView({
  rows,
  miningItems,
  role,
}: {
  rows: ReferenceRow[];
  miningItems: MiningOption[];
  role: AppRole;
}) {
  const [statusFilter, setStatusFilter] = useState<ReferenceStatus | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const editable = canWrite(role, "creative");

  const counts = useMemo(() => {
    const map = {} as Record<ReferenceStatus, number>;
    for (const row of rows) {
      map[row.reference.status] = (map[row.reference.status] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  const filtered = useMemo(
    () =>
      statusFilter
        ? rows.filter((r) => r.reference.status === statusFilter)
        : rows,
    [rows, statusFilter]
  );

  const addButton = editable ? (
    <Button size="sm" onClick={() => setQuickOpen(true)} className="gap-1.5">
      <Plus className="size-4" />
      Salvar Referência
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Referências"
        description="Criativos de terceiros salvos para modelar. Nada aqui é nosso."
        action={addButton}
      >
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs transition-colors",
              statusFilter === null
                ? "border-foreground/30 bg-accent text-accent-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            Todas {rows.length}
          </button>
          {REFERENCE_STATUSES.filter((s) => counts[s]).map((status) => (
            <button
              key={status}
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs transition-colors",
                statusFilter === status
                  ? "border-foreground/30 bg-accent text-accent-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {REFERENCE_STATUS_LABELS[status]} {counts[status]}
            </button>
          ))}
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BookMarked className="size-8" />}
          title="Nenhuma referência salva"
          description="Achou um anúncio bom? Cole o link aqui em segundos. Transcrição e análise podem vir depois."
          action={addButton}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ reference, miningName }) => (
            <Link
              key={reference.id}
              href={`/referencias/${reference.code}`}
              className="group rounded-lg border border-border/60 bg-card/40 p-3.5 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <EntityCode code={reference.code} />
                <StatusBadge
                  label={REFERENCE_STATUS_LABELS[reference.status]}
                  tone={REFERENCE_STATUS_TONE[reference.status]}
                  dot={false}
                />
              </div>

              {reference.whySaved ? (
                <p className="mt-2 line-clamp-2 text-sm">{reference.whySaved}</p>
              ) : (
                <p className="mt-2 truncate text-sm text-muted-foreground">
                  {reference.url ?? reference.storagePath ?? "—"}
                </p>
              )}

              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                {reference.url && <ExternalLink className="size-3" />}
                {reference.transcription && <span>transcrita</span>}
                {miningName && (
                  <span className="truncate">↳ {miningName}</span>
                )}
                <span className="ml-auto shrink-0">
                  {dateTime(reference.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ReferenceQuickDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        miningItems={miningItems}
      />
    </div>
  );
}
