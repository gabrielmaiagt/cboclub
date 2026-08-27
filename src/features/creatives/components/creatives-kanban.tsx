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

import { changeCreativeStatusAction } from "@/app/actions/creatives";
import { CreativeCard } from "@/features/creatives/components/creative-card";
import type { CreativeRow } from "@/features/creatives/types";
import { EMPTY } from "@/lib/format";
import {
  CREATIVE_KANBAN_COLUMNS,
  CREATIVE_KANBAN_CORE,
  CREATIVE_STATUS_LABELS,
  CREATIVE_STATUS_TONE,
  TONE_DOT,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import type { CreativeStatus } from "@/types/domain";

function DraggableCard({
  row,
  editable,
}: {
  row: CreativeRow;
  editable: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.creative.id,
    disabled: !editable,
  });

  const card = <CreativeCard row={row} dragging={isDragging} />;

  if (!editable) {
    return <Link href={`/criativos/${row.creative.code}`}>{card}</Link>;
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab">
      <Link
        href={`/criativos/${row.creative.code}`}
        onClick={(e) => {
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
  status: CreativeStatus;
  rows: CreativeRow[];
  editable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span
          className={cn(
            "size-1.5 rounded-full",
            TONE_DOT[CREATIVE_STATUS_TONE[status]]
          )}
        />
        <p className="text-xs font-medium">{CREATIVE_STATUS_LABELS[status]}</p>
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
          <DraggableCard key={row.creative.id} row={row} editable={editable} />
        ))}
        {!rows.length && (
          <p className="px-1 py-3 text-[11px] text-muted-foreground/40">
            {EMPTY}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Kanban de criativos (§15). Mesma mecanica do Kanban de ofertas:
 * arrastar muda o status via server action, com atualizacao otimista e
 * rollback se o servidor recusar.
 */
export function CreativesKanban({
  rows,
  editable,
}: {
  rows: CreativeRow[];
  editable: boolean;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, CreativeStatus>>(
    {}
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const effective = useMemo(
    () =>
      rows.map((row) =>
        optimistic[row.creative.id]
          ? {
              ...row,
              creative: {
                ...row.creative,
                status: optimistic[row.creative.id],
              },
            }
          : row
      ),
    [rows, optimistic]
  );

  const byStatus = useMemo(() => {
    const map = new Map<CreativeStatus, CreativeRow[]>();
    for (const status of CREATIVE_KANBAN_COLUMNS) map.set(status, []);
    for (const row of effective) map.get(row.creative.status)?.push(row);
    return map;
  }, [effective]);

  /**
   * Interface leve (§7): colunas raras so aparecem quando tem card ou
   * durante um drag (para poderem receber o drop). A granularidade
   * completa continua no banco e no menu de status.
   */
  const visibleColumns = useMemo(() => {
    if (activeId) return CREATIVE_KANBAN_COLUMNS;
    return CREATIVE_KANBAN_COLUMNS.filter(
      (status) =>
        (CREATIVE_KANBAN_CORE as CreativeStatus[]).includes(status) ||
        (byStatus.get(status)?.length ?? 0) > 0
    );
  }, [activeId, byStatus]);

  const activeRow = effective.find((r) => r.creative.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const creativeId = String(active.id);
    const target = String(over.id) as CreativeStatus;
    const current = effective.find((r) => r.creative.id === creativeId);
    if (!current || current.creative.status === target) return;

    const previous = current.creative.status;
    setOptimistic((prev) => ({ ...prev, [creativeId]: target }));

    const result = await changeCreativeStatusAction({
      id: creativeId,
      status: target,
    });

    if (!result.ok) {
      setOptimistic((prev) => ({ ...prev, [creativeId]: previous }));
      toast.error(result.error ?? "Não foi possível mover o criativo.");
      return;
    }

    toast.success(
      `${current.creative.code} → ${CREATIVE_STATUS_LABELS[target]}`
    );
    router.refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="thin-scroll flex gap-3 overflow-x-auto pb-4">
        {visibleColumns.map((status) => (
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
            <CreativeCard row={activeRow} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
