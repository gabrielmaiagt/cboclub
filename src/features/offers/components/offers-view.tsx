"use client";

import { useMemo, useState } from "react";
import { KanbanSquare, Package, Plus, Table2 } from "lucide-react";

import { OfferFormSheet } from "@/features/offers/components/offer-form-sheet";
import { OffersKanban } from "@/features/offers/components/offers-kanban";
import { OffersTable } from "@/features/offers/components/offers-table";
import type { OfferRow, UserOption } from "@/features/offers/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { canWrite } from "@/lib/auth/permissions";
import { OFFER_STATUS_TONE, TONE_CLASSES } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  OFFER_STATUS_LABELS,
  OFFER_STATUSES,
  type AppRole,
  type OfferStatus,
} from "@/types/domain";

interface OffersViewProps {
  rows: OfferRow[];
  role: AppRole;
  users: UserOption[];
}

type ViewMode = "table" | "kanban";

export function OffersView({ rows, role, users }: OffersViewProps) {
  const [mode, setMode] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<OfferStatus | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const editable = canWrite(role, "offers");

  const counts = useMemo(() => {
    const map = {} as Record<OfferStatus, number>;
    for (const row of rows) {
      map[row.offer.status] = (map[row.offer.status] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  const filtered = useMemo(
    () =>
      statusFilter ? rows.filter((r) => r.offer.status === statusFilter) : rows,
    [rows, statusFilter]
  );

  const newOfferButton = editable ? (
    <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
      <Plus className="size-4" />
      Nova Oferta
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ofertas"
        description={`${rows.length} ${rows.length === 1 ? "oferta" : "ofertas"} no sistema.`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border/60 p-0.5">
              <button
                onClick={() => setMode("table")}
                title="Tabela"
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                  mode === "table"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="size-3.5" />
                Tabela
              </button>
              <button
                onClick={() => setMode("kanban")}
                title="Kanban"
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                  mode === "kanban"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <KanbanSquare className="size-3.5" />
                Kanban
              </button>
            </div>
            {newOfferButton}
          </div>
        }
      >
        {/* Contadores por status: clicar filtra a lista (§6) */}
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
          {OFFER_STATUSES.filter((s) => counts[s]).map((status) => (
            <button
              key={status}
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs transition-colors",
                statusFilter === status
                  ? TONE_CLASSES[OFFER_STATUS_TONE[status]]
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {OFFER_STATUS_LABELS[status]} {counts[status]}
            </button>
          ))}
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" />}
          title="Nenhuma oferta ainda"
          description="Ofertas normalmente nascem da Mineração, mas você pode criar uma direto aqui."
          action={newOfferButton}
        />
      ) : mode === "table" ? (
        <OffersTable rows={filtered} />
      ) : (
        <OffersKanban rows={filtered} editable={editable} />
      )}

      <OfferFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        users={users}
        mode="create"
      />
    </div>
  );
}
