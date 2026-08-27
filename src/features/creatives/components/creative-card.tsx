"use client";

import { Link2, User } from "lucide-react";

import { EntityCode } from "@/components/shared/entity-code";
import type { CreativeRow } from "@/features/creatives/types";
import { duration } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Card de criativo.
 *
 * A OFERTA e a primeira coisa que se le (sistema orientado por oferta):
 * chip no topo do card, antes do titulo.
 */
export function CreativeCard({
  row,
  dragging,
  subStatus,
}: {
  row: CreativeRow;
  dragging?: boolean;
  /** Sub-status fino, mostrado quando a coluna agrupa varios estados. */
  subStatus?: string | null;
}) {
  const { creative, offerName, offerCode, editorName, scriptCode } = row;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 shadow-sm transition-colors hover:border-border",
        dragging && "opacity-40"
      )}
    >
      {/* Oferta em primeiro lugar */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate rounded bg-accent/70 px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
          {offerCode !== "—" ? `${offerCode} · ${offerName}` : offerName}
        </span>
        {subStatus && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {subStatus}
          </span>
        )}
      </div>

      <p className="truncate text-sm font-medium leading-snug">
        {creative.title}
      </p>
      <EntityCode code={creative.code} className="mt-0.5 block" />

      {creative.hook && (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          “{creative.hook}”
        </p>
      )}

      <div className="mt-2.5 flex items-center gap-2.5 text-[11px] text-muted-foreground">
        {creative.format && <span>{creative.format}</span>}
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
