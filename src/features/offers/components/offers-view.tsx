"use client";

import { useMemo, useState } from "react";
import { KanbanSquare, LayoutList, Package, Plus, Table2 } from "lucide-react";

import { OfferCard } from "@/features/offers/components/offer-card";
import { OfferFormSheet } from "@/features/offers/components/offer-form-sheet";
import { OffersKanban } from "@/features/offers/components/offers-kanban";
import { OffersTable } from "@/features/offers/components/offers-table";
import type { OfferRow, UserOption } from "@/features/offers/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { canWrite } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { type AppRole, type OfferStatus } from "@/types/domain";

interface OffersViewProps {
  rows: OfferRow[];
  role: AppRole;
  users: UserOption[];
}

type ViewMode = "cards" | "table" | "kanban";

/** Filtros simples (§8): Todas, Produção, Testando, Escalando, Encerradas. */
const QUICK_FILTERS: { key: string; label: string; statuses: OfferStatus[] | null }[] = [
  { key: "todas", label: "Todas", statuses: null },
  {
    key: "producao",
    label: "Produção",
    statuses: [
      "minerada",
      "pre_analise",
      "aprovada",
      "modelagem",
      "copy",
      "criativos",
      "pagina",
      "configuracao",
      "pronta",
    ],
  },
  { key: "testando", label: "Testando", statuses: ["testando"] },
  { key: "escalando", label: "Escalando", statuses: ["validada", "escalando"] },
  { key: "encerradas", label: "Encerradas", statuses: ["pausada", "morta"] },
];

export function OffersView({ rows, role, users }: OffersViewProps) {
  const [mode, setMode] = useState<ViewMode>("cards");
  const [filterKey, setFilterKey] = useState("todas");
  const [formOpen, setFormOpen] = useState(false);

  const editable = canWrite(role, "offers");
  const activeFilter = QUICK_FILTERS.find((f) => f.key === filterKey) ?? QUICK_FILTERS[0];

  const filtered = useMemo(
    () =>
      activeFilter.statuses
        ? rows.filter((r) => activeFilter.statuses!.includes(r.offer.status))
        : rows,
    [rows, activeFilter]
  );

  const newOfferButton = editable ? (
    <Button onClick={() => setFormOpen(true)} className="gap-2">
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
            <div className="flex items-center rounded-lg border border-border/60 p-1">
              <button
                onClick={() => setMode("cards")}
                title="Cards com os números de hoje e o que precisa ser feito"
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                  mode === "cards"
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="size-4" />
                Cards
              </button>
              <button
                onClick={() => setMode("table")}
                title="Tabela compacta"
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                  mode === "table"
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="size-4" />
                Lista
              </button>
              <button
                onClick={() => setMode("kanban")}
                title="Ofertas por etapa do funil — arraste para mover"
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                  mode === "kanban"
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <KanbanSquare className="size-4" />
                Funil
              </button>
            </div>
            {newOfferButton}
          </div>
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((f) => {
            const count = f.statuses
              ? rows.filter((r) => f.statuses!.includes(r.offer.status)).length
              : rows.length;
            return (
              <button
                key={f.key}
                onClick={() => setFilterKey(f.key)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  filterKey === f.key
                    ? "border-foreground/30 bg-accent text-accent-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label} {count}
              </button>
            );
          })}
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" />}
          title="Nenhuma oferta ainda"
          description="Ofertas normalmente nascem da Mineração, mas você pode criar uma direto aqui."
          action={newOfferButton}
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma oferta neste filtro.
        </p>
      ) : mode === "cards" ? (
        <div className="space-y-2.5">
          {filtered.map((row) => (
            <OfferCard key={row.offer.id} row={row} />
          ))}
        </div>
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
