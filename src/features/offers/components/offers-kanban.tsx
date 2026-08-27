"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { changeOfferStatusAction } from "@/app/actions/offers";
import { EntityCode } from "@/components/shared/entity-code";
import { HealthDot } from "@/components/shared/status-badge";
import type { OfferRow } from "@/features/offers/types";
import { EMPTY, money, multiplier } from "@/lib/format";
import {
  OFFER_HEALTH_LABELS,
  OFFER_HEALTH_TONE,
  OFFER_KANBAN_COLUMNS,
  OFFER_STATUS_TONE,
  TONE_DOT,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import { OFFER_STATUS_LABELS, type OfferStatus } from "@/types/domain";

interface OffersKanbanProps {
  rows: OfferRow[];
  editable: boolean;
}

function OfferCard({ row, dragging }: { row: OfferRow; dragging?: boolean }) {
  const { offer, responsibleName, today } = row;
  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card p-2.5 shadow-sm transition-shadow",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-1.5">
        <HealthDot
          tone={OFFER_HEALTH_TONE[offer.health]}
          title={`Saúde: ${OFFER_HEALTH_LABELS[offer.health]}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {offer.name}
          </p>
          <EntityCode code={offer.code} className="mt-0.5 block" />
        </div>
      </div>

      {today.spend > 0 && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="tabular">{money(today.spend)}</span>
          <span className="text-border">·</span>
          <span
            className={cn(
              "tabular",
              today.roas != null && today.roas >= 1.5 && "text-status-win",
              today.roas != null && today.roas < 1 && "text-status-danger"
            )}
          >
            {multiplier(today.roas)}
          </span>
        </div>
      )}

      {offer.nextAction && (
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          {offer.nextAction}
        </p>
      )}

      {responsibleName && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">
          {responsibleName}
        </p>
      )}
    </div>
  );
}

function DraggableCard({
  row,
  editable,
}: {
  row: OfferRow;
  editable: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.offer.id,
    disabled: !editable,
  });

  const card = <OfferCard row={row} dragging={isDragging} />;

  if (!editable) {
    return <Link href={`/ofertas/${row.offer.code}`}>{card}</Link>;
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab">
      <Link
        href={`/ofertas/${row.offer.code}`}
        onClick={(e) => {
          // Um drag nao deve navegar
          if (isDragging) e.preventDefault();
        }}
      >
        {card}
      </Link>
    </div>
  );
}

function Column({
  status,
  rows,
  editable,
}: {
  status: OfferStatus;
  rows: OfferRow[];
  editable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span
          className={cn("size-1.5 rounded-full", TONE_DOT[OFFER_STATUS_TONE[status]])}
        />
        <p className="text-xs font-medium">{OFFER_STATUS_LABELS[status]}</p>
        <span className="text-xs text-muted-foreground/60">{rows.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "thin-scroll flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-transparent p-1 transition-colors",
          isOver && "border-dashed border-foreground/25 bg-accent/30"
        )}
      >
        {rows.map((row) => (
          <DraggableCard key={row.offer.id} row={row} editable={editable} />
        ))}
        {!rows.length && (
          <p className="px-1 py-3 text-[11px] text-muted-foreground/40">{EMPTY}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Kanban do pipeline de producao (§11).
 *
 * Arrastar o card entre colunas muda o status e grava uma linha na
 * timeline — a mesma server action que o formulario usa.
 */
export function OffersKanban({ rows, editable }: OffersKanbanProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, OfferStatus>>({});

  const sensors = useSensors(
    // 6px de tolerancia: sem isso, um clique vira drag e a navegacao quebra
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const effective = useMemo(
    () =>
      rows.map((row) =>
        optimistic[row.offer.id]
          ? { ...row, offer: { ...row.offer, status: optimistic[row.offer.id] } }
          : row
      ),
    [rows, optimistic]
  );

  const byStatus = useMemo(() => {
    const map = new Map<OfferStatus, OfferRow[]>();
    for (const status of OFFER_KANBAN_COLUMNS) map.set(status, []);
    for (const row of effective) {
      map.get(row.offer.status)?.push(row);
    }
    return map;
  }, [effective]);

  const activeRow = effective.find((r) => r.offer.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const offerId = String(active.id);
    const target = String(over.id) as OfferStatus;
    const current = effective.find((r) => r.offer.id === offerId);
    if (!current || current.offer.status === target) return;

    const previous = current.offer.status;
    setOptimistic((prev) => ({ ...prev, [offerId]: target }));

    const result = await changeOfferStatusAction({ id: offerId, status: target });

    if (!result.ok) {
      // Reverte a posicao do card se o servidor recusou
      setOptimistic((prev) => ({ ...prev, [offerId]: previous }));
      toast.error(result.error ?? "Não foi possível mover a oferta.");
      return;
    }

    toast.success(
      `${current.offer.code} → ${OFFER_STATUS_LABELS[target]}`
    );
    router.refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-wrap gap-3 pb-4">
        {OFFER_KANBAN_COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            rows={byStatus.get(status) ?? []}
            editable={editable}
          />
        ))}
      </div>

      <DragOverlay>
        {activeRow ? (
          <div className="w-64 rotate-1">
            <OfferCard row={activeRow} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
