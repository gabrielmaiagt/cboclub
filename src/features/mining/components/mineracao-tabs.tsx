"use client";

import { useState } from "react";
import { BookMarked, Pickaxe } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { MiningView } from "@/features/mining/components/mining-view";
import type { MiningRow } from "@/features/mining/types";
import { ReferencesView } from "@/features/references/components/references-view";
import type { MiningOption, ReferenceRow } from "@/features/references/types";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/domain";

/**
 * Mineração: tabs "Ofertas" | "Criativos" (§17). Ativos externos,
 * separados de Ofertas/Criativos internos por definicao — nunca se
 * misturam nas mesmas telas nem nas mesmas collections.
 */
export function MineracaoTabs({
  miningRows,
  referenceRows,
  miningItems,
  role,
}: {
  miningRows: MiningRow[];
  referenceRows: ReferenceRow[];
  miningItems: MiningOption[];
  role: AppRole;
}) {
  const [tab, setTab] = useState<"ofertas" | "criativos">("ofertas");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mineração"
        description="Ofertas e criativos de terceiros para estudar ou modelar. Nunca é nossa operação."
      />

      <div className="flex items-center rounded-lg border border-border/60 p-1 w-fit">
        <button
          onClick={() => setTab("ofertas")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3.5 text-sm transition-colors",
            tab === "ofertas"
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Pickaxe className="size-4" />
          Ofertas
          <span className="text-xs text-muted-foreground">{miningRows.length}</span>
        </button>
        <button
          onClick={() => setTab("criativos")}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-md px-3.5 text-sm transition-colors",
            tab === "criativos"
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BookMarked className="size-4" />
          Criativos
          <span className="text-xs text-muted-foreground">{referenceRows.length}</span>
        </button>
      </div>

      {tab === "ofertas" ? (
        <MiningView rows={miningRows} role={role} />
      ) : (
        <ReferencesView rows={referenceRows} miningItems={miningItems} role={role} />
      )}
    </div>
  );
}
