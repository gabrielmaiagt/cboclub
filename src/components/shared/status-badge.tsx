import { cn } from "@/lib/utils";
import { TONE_CLASSES, TONE_DOT, type StatusTone } from "@/lib/status";

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  className?: string;
  /** Ponto colorido à esquerda. Ajuda a varrer uma tabela longa. */
  dot?: boolean;
}

export function StatusBadge({
  label,
  tone,
  className,
  dot = true,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {dot && (
        <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      )}
      {label}
    </span>
  );
}

interface HealthDotProps {
  tone: StatusTone;
  title: string;
  className?: string;
}

/** Semáforo de saúde da oferta (§50). Sem texto: só o sinal. */
export function HealthDot({ tone, title, className }: HealthDotProps) {
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full ring-2 ring-inset ring-background",
        TONE_DOT[tone],
        className
      )}
    />
  );
}
