"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Smartphone } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { EntityCode } from "@/components/shared/entity-code";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ChipFormDialog } from "@/features/chips/components/chip-form-dialog";
import type { ChipRow, UserOption } from "@/features/chips/types";
import { canWrite } from "@/lib/auth/permissions";
import { EMPTY } from "@/lib/format";
import { CHIP_STATUS_LABELS, CHIP_STATUS_TONE } from "@/lib/status";
import { cn } from "@/lib/utils";
import { CHIP_STATUSES, type AppRole, type ChipStatus } from "@/types/domain";

interface ChipsViewProps {
  rows: ChipRow[];
  capacity: (Record<ChipStatus, number> & { total: number }) | null;
  chipsTarget: number;
  role: AppRole;
  users: UserOption[];
}

export function ChipsView({ rows, capacity, chipsTarget, role, users }: ChipsViewProps) {
  const [statusFilter, setStatusFilter] = useState<ChipStatus | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const editable = canWrite(role, "ops");

  const filtered = useMemo(
    () => (statusFilter ? rows.filter((r) => r.chip.status === statusFilter) : rows),
    [rows, statusFilter]
  );

  const addButton = editable ? (
    <Button onClick={() => setFormOpen(true)} className="gap-2">
      <Plus className="size-4" />
      Adicionar Chip
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="Chips" description="Quantos existem, onde estão e o que precisam." action={addButton} />

      {/* Capacidade (§43) */}
      {capacity && (
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Capacidade operacional</p>
            <p className="tabular text-sm text-muted-foreground">
              {capacity.total} / {chipsTarget}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full bg-status-live"
              style={{ width: `${Math.min(100, (capacity.total / chipsTarget) * 100)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-7">
            {CHIP_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-left transition-colors",
                  statusFilter === s
                    ? "border-foreground/30 bg-accent"
                    : "border-border/50 hover:border-border"
                )}
              >
                <p className="tabular text-sm font-semibold">{capacity[s] ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">{CHIP_STATUS_LABELS[s]}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Smartphone className="size-8" />}
          title="Nenhum chip ainda"
          description="Cadastre o primeiro chip: número, status e responsável."
          action={addButton}
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum chip neste status.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <tbody>
              {filtered.map(({ chip, responsibleName, offerName, offerCode }) => (
                <tr key={chip.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3.5 py-2.5">
                    <Link href={`/chips/${chip.code}`} className="hover:underline">
                      <EntityCode code={chip.code} />
                      {chip.maskedNumber && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {chip.maskedNumber}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <StatusBadge label={CHIP_STATUS_LABELS[chip.status]} tone={CHIP_STATUS_TONE[chip.status]} dot={false} />
                  </td>
                  <td className="px-3.5 py-2.5 text-muted-foreground">{chip.operator ?? EMPTY}</td>
                  <td className="px-3.5 py-2.5 text-muted-foreground">{responsibleName ?? EMPTY}</td>
                  <td className="px-3.5 py-2.5">
                    {offerCode ? (
                      <Link href={`/ofertas/${offerCode}`} className="text-sm hover:underline">
                        {offerName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{EMPTY}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ChipFormDialog open={formOpen} onOpenChange={setFormOpen} users={users} />
    </div>
  );
}
