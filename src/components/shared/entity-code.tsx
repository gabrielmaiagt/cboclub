import { cn } from "@/lib/utils";

/**
 * Codigo interno (OFFER-0001, CR-0001, CHIP-001).
 *
 * Existe para a comunicacao do time: "sobe o CR-0028" e menos ambiguo do
 * que "sobe o video da mulher com a bolsa". Monoespacado para bater o
 * alinhamento em listas.
 */
export function EntityCode({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] tracking-tight text-muted-foreground",
        className
      )}
    >
      {code}
    </span>
  );
}
