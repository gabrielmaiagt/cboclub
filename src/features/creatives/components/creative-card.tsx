"use client";

import { Clapperboard, Link2, User } from "lucide-react";

import { EntityCode } from "@/components/shared/entity-code";
import type { CreativeRow } from "@/features/creatives/types";
import { duration } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Card de criativo — usado no Kanban e no grid.
 * Denso de proposito: o editor varre dezenas por dia.
 */
export function CreativeCard({
  row,
  dragging,
}: {
  row: CreativeRow;
  dragging?: boolean;
}) {
  const { creative, offerCode, angleName, editorName, scriptCode } = row;

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card p-2.5 shadow-sm",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">
            {creative.title}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <EntityCode code={creative.code} />
            <span className="text-[10px] text-muted-foreground/60">
              {offerCode}
            </span>
          </div>
        </div>
        {creative.format && (
          <span className="shrink-0 rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {creative.format}
          </span>
        )}
      </div>

      {creative.hook && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">
          “{creative.hook}”
        </p>
      )}

      {creative.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {creative.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-accent/60 px-1 py-px text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {creative.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground/50">
              +{creative.tags.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2.5 text-[10px] text-muted-foreground/70">
        {angleName && (
          <span className="flex items-center gap-1">
            <Clapperboard className="size-3" />
            {angleName}
          </span>
        )}
        {scriptCode && (
          <span className="flex items-center gap-1">
            <Link2 className="size-3" />
            {scriptCode}
            {creative.scriptVersion != null && ` V${creative.scriptVersion}`}
          </span>
        )}
        {creative.durationSeconds != null && (
          <span>{duration(creative.durationSeconds)}</span>
        )}
        {editorName && (
          <span className="ml-auto flex items-center gap-1">
            <User className="size-3" />
            {editorName.split(" ")[0]}
          </span>
        )}
      </div>
    </div>
  );
}
