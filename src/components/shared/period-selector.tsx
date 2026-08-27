import Link from "next/link";

import { cn } from "@/lib/utils";
import { PERIOD_LABELS, PERIODS, type Period } from "@/lib/period";

/** Segmentado Hoje / Ontem / 7 dias / Este mês / Total — navega via querystring. */
export function PeriodSelector({
  value,
  basePath,
}: {
  value: Period;
  basePath: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/40 p-0.5">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={p === "today" ? basePath : `${basePath}?period=${p}`}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            p === value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {PERIOD_LABELS[p]}
        </Link>
      ))}
    </div>
  );
}
