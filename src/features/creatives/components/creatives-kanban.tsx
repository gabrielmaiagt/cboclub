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
import {
  CREATIVE_BOARD_HIDDEN,
  CREATIVE_STAGES,
  CREATIVE_STATUS_LABELS,
  TONE_DOT,
  type CreativeStage,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import type { CreativeStatus } from "@/types/domain";

/**
 * Quadro de producao de criativos.
 *
 * 6 macroetapas em vez de 12 colunas: legivel em segundos por alguem
 * novo na operacao. O sub-status fino continua no banco — aparece como
 * selo no card quando a etapa agrupa mais de um estado.
 */

function DraggableCard({
  row,
  editable,
  showSubStatus,
}: {
  row: CreativeRow;
  editable: boolean;
  showSubStatus: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: row.creative.id,
    disabled: !editable,
  });

  const card = (
    <CreativeCard
      row={row}
      dragging={isDragging}
      subStatus={showSubStatus ? CREATIVE_STATUS_LABELS[row.creative.status] : null}
    />
  );

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

/** Zona de soltura simples (uma por etapa, exceto Resultado). */
function DropZone({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-transparent p-1.5 transition-colors",
        isOver && "border-dashed border-foreground/30 bg-accent/40",
        className
      )}
    >
      {children}
    </div>
  );
}

function StageColumn({
  stage,
  rows,
  editable,
}: {
  stage: CreativeStage;
  rows: CreativeRow[];
  editable: boolean;
}) {
  const grouped = stage.statuses.length > 1;

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", TONE_DOT[stage.tone])} />
        <p className="text-sm font-medium">{stage.label}</p>
        <span className="text-sm text-muted-foreground">{rows.length}</span>
      </div>

      {stage.dropStatus !== null ? (
        <DropZone
          id={`stage:${stage.dropStatus}`}
          className="thin-scroll min-h-36 flex-1 overflow-y-auto"
        >
          {rows.map((row) => (
            <DraggableCard
              key={row.creative.id}
              row={row}
              editable={editable}
              showSubStatus={grouped}
            />
          ))}
          {!rows.length && (
            <p className="px-1.5 py-4 text-xs text-muted-foreground/60">
              Arraste um card para cá
            </p>
          )}
        </DropZone>
      ) : (
        /* Resultado: nao existe default seguro entre ganhar e perder,
           entao cada um tem a sua zona de soltura. */
        <div className="flex min-h-36 flex-1 flex-col gap-2">
          {stage.statuses.map((status) => {
            const statusRows = rows.filter((r) => r.creative.status === status);
            return (
              <DropZone
                key={status}
                id={`stage:${status}`}
                className="flex-1 bg-card/20"
              >
                <p
                  className={cn(
                    "px-1 text-xs font-medium",
                    status === "vencedor"
                      ? "text-status-win"
                      : "text-status-danger"
                  )}
                >
                  {CREATIVE_STATUS_LABELS[status]} · {statusRows.length}
                </p>
                {statusRows.map((row) => (
                  <DraggableCard
                    key={row.creative.id}
                    row={row}
                    editable={editable}
                    showSubStatus={false}
                  />
                ))}
              </DropZone>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
      rows
        .map((row) =>
          optimistic[row.creative.id]
            ? {
                ...row,
                creative: {
                  ...row.creative,
                  status: optimistic[row.creative.id],
                },
              }
            : row
        )
        .filter(
          (row) => !CREATIVE_BOARD_HIDDEN.includes(row.creative.status)
        ),
    [rows, optimistic]
  );

  const byStage = useMemo(() => {
    const map = new Map<string, CreativeRow[]>();
    for (const stage of CREATIVE_STAGES) map.set(stage.key, []);
    for (const row of effective) {
      const stage = CREATIVE_STAGES.find((s) =>
        s.statuses.includes(row.creative.status)
      );
      if (stage) map.get(stage.key)?.push(row);
    }
    return map;
  }, [effective]);

  const activeRow = effective.find((r) => r.creative.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const creativeId = String(active.id);
    // Zonas de soltura carregam o status alvo no proprio id
    const target = String(over.id).replace("stage:", "") as CreativeStatus;
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
      <div className="thin-scroll flex gap-4 overflow-x-auto pb-4">
        {CREATIVE_STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            rows={byStage.get(stage.key) ?? []}
            editable={editable}
          />
        ))}
      </div>

      <DragOverlay>
        {activeRow ? (
          <div className="w-72 rotate-1">
            <CreativeCard row={activeRow} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
