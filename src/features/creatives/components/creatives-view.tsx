"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Boxes, Columns3, Package, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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

/**
 * Fila de producao da equipe entre todas as ofertas.
 *
 * Duas visoes sobre os mesmos dados:
 *  - "Etapas": quadro de producao (o que esta travado onde?)
 *  - "Por oferta": agrupado por oferta (o que cada oferta tem?)
 * O trabalho de UMA oferta especifica vive na pagina da oferta.
 */
export function CreativesView({
  rows,
  offers,
  scripts,
  users,
  taxonomy,
  role,
}: CreativesViewProps) {
  const [mode, setMode] = useState<"stages" | "byOffer">("stages");
  const [formOpen, setFormOpen] = useState(false);

  const editable = canWrite(role, "creative");

  /** Agrupamento por oferta, na ordem das ofertas mais recentes. */
  const groups = useMemo(() => {
    const map = new Map<string, CreativeRow[]>();
    for (const row of rows) {
      const list = map.get(row.creative.offerId);
      if (list) list.push(row);
      else map.set(row.creative.offerId, [row]);
    }
    return [...map.entries()].map(([offerId, items]) => ({
      offerId,
      offerCode: items[0].offerCode,
      offerName: items[0].offerName,
      items,
    }));
  }, [rows]);

  const newButton = editable ? (
    <Button onClick={() => setFormOpen(true)} className="gap-2">
      <Plus className="size-4" />
      Novo Criativo
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Criativos"
        description="Fila de produção da equipe, entre todas as ofertas. Para trabalhar numa oferta específica, abra a página dela."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/60 p-1">
              <button
                onClick={() => setMode("stages")}
                title="Quadro por etapa de produção"
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                  mode === "stages"
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Columns3 className="size-4" />
                Etapas
              </button>
              <button
                onClick={() => setMode("byOffer")}
                title="Agrupado por oferta"
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                  mode === "byOffer"
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="size-4" />
                Por oferta
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
          description="Crie o primeiro pedido de criativo e ele aparece no quadro do editor."
          action={newButton}
        />
      ) : mode === "stages" ? (
        <CreativesKanban rows={rows} editable={editable} />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.offerId}>
              <Link
                href={`/ofertas/${group.offerCode}`}
                className="group mb-3 flex items-baseline gap-2.5"
              >
                <h2 className="text-base font-semibold group-hover:underline">
                  {group.offerName}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {group.offerCode}
                </span>
                <span className="text-sm text-muted-foreground">
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "criativo" : "criativos"}
                </span>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.items.map((row) => (
                  <Link
                    key={row.creative.id}
                    href={`/criativos/${row.creative.code}`}
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
            </section>
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
