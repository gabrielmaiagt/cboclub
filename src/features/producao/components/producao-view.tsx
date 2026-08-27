"use client";

import { useState } from "react";
import { Boxes, PenLine } from "lucide-react";

import { CreativesView } from "@/features/creatives/components/creatives-view";
import type { CreativeRow, OfferOption, ScriptOption, UserOption } from "@/features/creatives/types";
import { ScriptsView } from "@/features/scripts/components/scripts-view";
import type { ScriptRow } from "@/features/scripts/types";
import { cn } from "@/lib/utils";
import type { AppRole, Taxonomy } from "@/types/domain";

interface ProducaoViewProps {
  creativeRows: CreativeRow[];
  scriptRows: ScriptRow[];
  offers: OfferOption[];
  scripts: ScriptOption[];
  users: UserOption[];
  taxonomy: Taxonomy;
  role: AppRole;
}

/**
 * Produção (§13): a fila de trabalho da equipe entre todas as ofertas,
 * organizada como duas visoes sobre as mesmas collections — nenhum dado
 * duplicado, so a apresentacao muda.
 */
export function ProducaoView({
  creativeRows,
  scriptRows,
  offers,
  scripts,
  users,
  taxonomy,
  role,
}: ProducaoViewProps) {
  const [tab, setTab] = useState<"criativos" | "copies">("criativos");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Produção</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fila de criativos e copies da equipe, entre todas as ofertas.
        </p>
      </div>

      <div className="flex items-center rounded-lg border border-border/60 p-1 w-fit">
        <button
          onClick={() => setTab("criativos")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3.5 text-sm transition-colors",
            tab === "criativos"
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Boxes className="size-4" />
          Criativos
          <span className="text-xs text-muted-foreground">{creativeRows.length}</span>
        </button>
        <button
          onClick={() => setTab("copies")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3.5 text-sm transition-colors",
            tab === "copies"
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <PenLine className="size-4" />
          Copies
          <span className="text-xs text-muted-foreground">{scriptRows.length}</span>
        </button>
      </div>

      {tab === "criativos" ? (
        <CreativesView
          rows={creativeRows}
          offers={offers}
          scripts={scripts}
          users={users}
          taxonomy={taxonomy}
          role={role}
        />
      ) : (
        <ScriptsView
          rows={scriptRows}
          offers={offers}
          users={users}
          role={role}
          formats={taxonomy.creativeFormats.map((f) => ({ slug: f.slug, name: f.name }))}
        />
      )}
    </div>
  );
}
