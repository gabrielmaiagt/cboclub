"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pickaxe, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { EntityCode } from "@/components/shared/entity-code";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { MiningQuickDialog } from "@/features/mining/components/mining-quick-dialog";
import type { MiningRow } from "@/features/mining/types";
import { canWrite } from "@/lib/auth/permissions";
import { MINING_STATUS_LABELS, MINING_STATUS_TONE } from "@/lib/status";
import { cn } from "@/lib/utils";
import { MINING_STATUSES, type AppRole, type MiningStatus } from "@/types/domain";

export function MiningView({ rows, role }: { rows: MiningRow[]; role: AppRole }) {
  const [statusFilter, setStatusFilter] = useState<MiningStatus | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const editable = canWrite(role, "traffic");

  const counts = useMemo(() => {
    const map = {} as Record<MiningStatus, number>;
    for (const row of rows) map[row.item.status] = (map[row.item.status] ?? 0) + 1;
    return map;
  }, [rows]);

  const filtered = useMemo(
    () => (statusFilter ? rows.filter((r) => r.item.status === statusFilter) : rows),
    [rows, statusFilter]
  );

  const addButton = editable ? (
    <Button onClick={() => setQuickOpen(true)} className="gap-2">
      <Plus className="size-4" />
      Salvar Oferta Minerada
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Ofertas Mineradas</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ofertas de terceiros encontradas no mercado. Nunca é nossa operação.
          </p>
        </div>
        {addButton}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs transition-colors",
            statusFilter === null
              ? "border-foreground/30 bg-accent text-accent-foreground"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          )}
        >
          Todas {rows.length}
        </button>
        {MINING_STATUSES.filter((s) => counts[s]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              statusFilter === s
                ? "border-foreground/30 bg-accent text-accent-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            )}
          >
            {MINING_STATUS_LABELS[s]} {counts[s]}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Pickaxe className="size-8" />}
          title="Nenhuma oferta minerada ainda"
          description="Achou algo interessante no mercado? Salve o link em segundos."
          action={addButton}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ item, offerCode }) => (
            <Link
              key={item.id}
              href={`/mineracao/${item.code}`}
              className="rounded-lg border border-border/60 bg-card/40 p-3.5 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <EntityCode code={item.code} />
                <StatusBadge
                  label={MINING_STATUS_LABELS[item.status]}
                  tone={MINING_STATUS_TONE[item.status]}
                  dot={false}
                />
              </div>
              <p className="mt-2 truncate text-sm font-medium">{item.name}</p>
              {item.whyInteresting && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {item.whyInteresting}
                </p>
              )}
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground/70">
                {item.score != null && <span>score {item.score}/5</span>}
                {offerCode && <span>↳ virou {offerCode}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      <MiningQuickDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  );
}
