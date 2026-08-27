"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Boxes, KanbanSquare, LayoutGrid, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreativeCard } from "@/features/creatives/components/creative-card";
import { CreativeFormSheet } from "@/features/creatives/components/creative-form-sheet";
import { CreativesKanban } from "@/features/creatives/components/creatives-kanban";
import type {
  CreativeRow,
  OfferOption,
  ScriptOption,
  UserOption,
} from "@/features/creatives/types";
import { canWrite } from "@/lib/auth/permissions";
import { CREATIVE_STATUS_LABELS, CREATIVE_STATUS_TONE } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { AppRole, Taxonomy } from "@/types/domain";

interface CreativesViewProps {
  rows: CreativeRow[];
  offers: OfferOption[];
  scripts: ScriptOption[];
  users: UserOption[];
  taxonomy: Taxonomy;
  role: AppRole;
}

const ALL = "__all__";

export function CreativesView({
  rows,
  offers,
  scripts,
  users,
  taxonomy,
  role,
}: CreativesViewProps) {
  const [mode, setMode] = useState<"kanban" | "grid">("kanban");
  const [offerFilter, setOfferFilter] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);

  const editable = canWrite(role, "creative");

  const filtered = useMemo(
    () =>
      offerFilter === ALL
        ? rows
        : rows.filter((r) => r.creative.offerId === offerFilter),
    [rows, offerFilter]
  );

  const newButton = editable ? (
    <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
      <Plus className="size-4" />
      Novo Criativo
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Criativos"
        description={`${rows.length} ${rows.length === 1 ? "criativo" : "criativos"} no sistema.`}
        action={
          <div className="flex items-center gap-2">
            <Select value={offerFilter} onValueChange={setOfferFilter}>
              <SelectTrigger className="h-8 w-52 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as ofertas</SelectItem>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.code} · {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-md border border-border/60 p-0.5">
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
              <button
                onClick={() => setMode("grid")}
                title="Grid"
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
                  mode === "grid"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="size-3.5" />
                Grid
              </button>
            </div>
            {newButton}
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Boxes className="size-8" />}
          title="Nenhum criativo ainda"
          description="Crie o primeiro pedido de criativo e ele aparece no Kanban do editor."
          action={newButton}
        />
      ) : mode === "kanban" ? (
        <CreativesKanban rows={filtered} editable={editable} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((row) => (
            <Link
              key={row.creative.id}
              href={`/criativos/${row.creative.code}`}
              className="group"
            >
              <div className="space-y-1.5">
                <CreativeCard row={row} />
                <StatusBadge
                  label={CREATIVE_STATUS_LABELS[row.creative.status]}
                  tone={CREATIVE_STATUS_TONE[row.creative.status]}
                  className="ml-1"
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreativeFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        offers={offers}
        scripts={scripts}
        users={users}
        taxonomy={taxonomy}
      />
    </div>
  );
}
