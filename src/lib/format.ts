/**
 * Formatacao para exibicao. pt-BR e BRL em todo o sistema.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const INT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const DEC = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PCT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Placeholder unico para "nao ha dado". */
export const EMPTY = "—";

export function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return BRL.format(value);
}

export function moneyCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return BRL_COMPACT.format(value);
}

export function integer(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return INT.format(value);
}

export function decimal(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return DEC.format(value);
}

export function percent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return PCT.format(value);
}

/** ROAS e ROI aparecem como multiplicador: 2,4x */
export function multiplier(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return `${DEC.format(value)}x`;
}

/** Variacao com sinal: +12,4% / -3,1% */
export function signedPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  const sign = value > 0 ? "+" : "";
  return `${sign}${PCT.format(value)}`;
}

// ── Datas ───────────────────────────────────────────────────────────

/**
 * Data de negocio como 'YYYY-MM-DD' no fuso de Sao Paulo.
 *
 * O dia operacional e o dia brasileiro. Usar UTC faria o dashboard virar
 * a meia-noite errada e jogar o gasto da noite para o dia seguinte.
 */
export function businessDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Desloca uma data 'YYYY-MM-DD' por N dias. */
export function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' -> '27/08' */
export function shortDate(isoDate: string | null | undefined): string {
  if (!isoDate) return EMPTY;
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

/** 'YYYY-MM-DD' -> '27/08/2026' */
export function fullDate(isoDate: string | null | undefined): string {
  if (!isoDate) return EMPTY;
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** ISO completo -> '27/08 14:32' */
export function dateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Duracao em segundos -> '2min07s' */
export function duration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return EMPTY;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (!m) return `${s}s`;
  return `${m}min${String(s).padStart(2, "0")}s`;
}

/** Diferenca em dias entre uma data de negocio e hoje. */
export function daysFromToday(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const today = businessDate();
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/** 'Hoje', 'Amanhã', 'Atrasado 3d', '30/08' */
export function relativeDeadline(isoDate: string | null | undefined): string {
  const diff = daysFromToday(isoDate);
  if (diff == null) return EMPTY;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff < 0) return `Atrasado ${Math.abs(diff)}d`;
  if (diff <= 7) return `Em ${diff}d`;
  return fullDate(isoDate);
}
