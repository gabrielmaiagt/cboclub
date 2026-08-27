/**
 * Cores e rotulos de status.
 *
 * Uma oferta "Testando" precisa ter a mesma cor no Kanban, na tabela, no
 * dashboard e no card. Centralizar aqui e o que garante isso.
 */
import type {
  CreativeStatus,
  MiningStatus,
  OfferHealth,
  OfferStatus,
  Priority,
  ReferenceStatus,
  ScriptStatus,
  TaskStatus,
} from "@/types/domain";

export type StatusTone =
  | "neutral"
  | "progress"
  | "ready"
  | "live"
  | "win"
  | "warn"
  | "danger"
  | "dead";

/** Classes Tailwind por tom. Fundo suave + texto forte + borda discreta. */
export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-status-neutral/10 text-status-neutral border-status-neutral/25",
  progress: "bg-status-progress/10 text-status-progress border-status-progress/25",
  ready: "bg-status-ready/10 text-status-ready border-status-ready/25",
  live: "bg-status-live/10 text-status-live border-status-live/25",
  win: "bg-status-win/15 text-status-win border-status-win/30",
  warn: "bg-status-warn/10 text-status-warn border-status-warn/25",
  danger: "bg-status-danger/10 text-status-danger border-status-danger/25",
  dead: "bg-status-dead/10 text-status-dead border-status-dead/25",
};

export const TONE_DOT: Record<StatusTone, string> = {
  neutral: "bg-status-neutral",
  progress: "bg-status-progress",
  ready: "bg-status-ready",
  live: "bg-status-live",
  win: "bg-status-win",
  warn: "bg-status-warn",
  danger: "bg-status-danger",
  dead: "bg-status-dead",
};

/**
 * Ofertas. O tom conta a historia do funil: cinza enquanto e ideia,
 * azul enquanto se produz, ciano quando esta pronta, verde quando esta
 * no ar dando dinheiro, vermelho quando morreu.
 */
export const OFFER_STATUS_TONE: Record<OfferStatus, StatusTone> = {
  minerada: "neutral",
  pre_analise: "neutral",
  aprovada: "progress",
  modelagem: "progress",
  copy: "progress",
  criativos: "progress",
  pagina: "progress",
  configuracao: "progress",
  pronta: "ready",
  testando: "live",
  validada: "win",
  escalando: "win",
  pausada: "warn",
  morta: "dead",
};

export const OFFER_HEALTH_TONE: Record<OfferHealth, StatusTone> = {
  saudavel: "win",
  atencao: "warn",
  critico: "danger",
};

export const OFFER_HEALTH_LABELS: Record<OfferHealth, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  critico: "Crítico",
};

export const CREATIVE_STATUS_TONE: Record<CreativeStatus, StatusTone> = {
  ideia: "neutral",
  modelar: "neutral",
  copy: "progress",
  aguardando_edicao: "warn",
  editando: "progress",
  revisao: "progress",
  aprovado: "ready",
  pronto_para_teste: "ready",
  testando: "live",
  vencedor: "win",
  perdedor: "danger",
  arquivado: "dead",
};

export const CREATIVE_STATUS_LABELS: Record<CreativeStatus, string> = {
  ideia: "Ideia",
  modelar: "Modelar",
  copy: "Copy",
  aguardando_edicao: "Aguardando edição",
  editando: "Editando",
  revisao: "Revisão",
  aprovado: "Aprovado",
  pronto_para_teste: "Pronto p/ teste",
  testando: "Testando",
  vencedor: "Vencedor",
  perdedor: "Perdedor",
  arquivado: "Arquivado",
};

export const SCRIPT_STATUS_TONE: Record<ScriptStatus, StatusTone> = {
  rascunho: "neutral",
  revisao: "progress",
  aprovado: "ready",
  em_uso: "live",
  arquivado: "dead",
};

export const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  rascunho: "Rascunho",
  revisao: "Revisão",
  aprovado: "Aprovado",
  em_uso: "Em uso",
  arquivado: "Arquivado",
};

/** Colunas do Kanban de criativos (§15), na ordem de producao. */
export const CREATIVE_KANBAN_COLUMNS: CreativeStatus[] = [
  "ideia",
  "modelar",
  "copy",
  "aguardando_edicao",
  "editando",
  "revisao",
  "aprovado",
  "pronto_para_teste",
  "testando",
  "vencedor",
  "perdedor",
  "arquivado",
];

/**
 * MACROETAPAS do quadro de criativos.
 *
 * 12 status viram 6 colunas que qualquer pessoa nova entende em
 * segundos. A granularidade fina continua no banco e no menu de status —
 * o quadro mostra o sub-status como selo no card quando a coluna agrupa
 * mais de um. Soltar um card na coluna aplica o `dropStatus`.
 *
 * "Resultado" tem duas zonas de soltura (Vencedor / Perdedor): nao
 * existe default seguro entre ganhar e perder.
 */
export interface CreativeStage {
  key: string;
  label: string;
  statuses: CreativeStatus[];
  /** Status aplicado ao soltar um card na coluna (null = usa subzonas). */
  dropStatus: CreativeStatus | null;
  tone: StatusTone;
}

export const CREATIVE_STAGES: CreativeStage[] = [
  {
    key: "ideias",
    label: "Ideias",
    statuses: ["ideia", "modelar", "copy"],
    dropStatus: "ideia",
    tone: "neutral",
  },
  {
    key: "edicao",
    label: "Em edição",
    statuses: ["aguardando_edicao", "editando"],
    dropStatus: "aguardando_edicao",
    tone: "progress",
  },
  {
    key: "revisao",
    label: "Revisão",
    statuses: ["revisao"],
    dropStatus: "revisao",
    tone: "warn",
  },
  {
    key: "pronto",
    label: "Pronto",
    statuses: ["aprovado", "pronto_para_teste"],
    dropStatus: "aprovado",
    tone: "ready",
  },
  {
    key: "no_ar",
    label: "No ar",
    statuses: ["testando"],
    dropStatus: "testando",
    tone: "live",
  },
  {
    key: "resultado",
    label: "Resultado",
    statuses: ["vencedor", "perdedor"],
    dropStatus: null,
    tone: "win",
  },
];

/** Arquivados ficam fora do quadro; continuam na galeria e no detalhe. */
export const CREATIVE_BOARD_HIDDEN: CreativeStatus[] = ["arquivado"];

export const REFERENCE_STATUS_TONE: Record<ReferenceStatus, StatusTone> = {
  salvo: "neutral",
  modelar: "warn",
  modelado: "win",
  descartado: "dead",
};

export const REFERENCE_STATUS_LABELS: Record<ReferenceStatus, string> = {
  salvo: "Salvo",
  modelar: "Quero modelar",
  modelado: "Modelado",
  descartado: "Descartado",
};

export const MINING_STATUS_TONE: Record<MiningStatus, StatusTone> = {
  encontrada: "neutral",
  analisar: "progress",
  interessante: "progress",
  aprovada: "ready",
  modelar: "ready",
  descartada: "dead",
  convertida: "win",
};

export const MINING_STATUS_LABELS: Record<MiningStatus, string> = {
  encontrada: "Encontrada",
  analisar: "Analisar",
  interessante: "Interessante",
  aprovada: "Aprovada",
  modelar: "Modelar",
  descartada: "Descartada",
  convertida: "Convertida",
};

export const TASK_STATUS_TONE: Record<TaskStatus, StatusTone> = {
  backlog: "neutral",
  fazer: "progress",
  fazendo: "progress",
  revisao: "warn",
  concluido: "win",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  fazer: "Fazer",
  fazendo: "Fazendo",
  revisao: "Revisão",
  concluido: "Concluído",
};

export const PRIORITY_TONE: Record<Priority, StatusTone> = {
  baixa: "neutral",
  media: "progress",
  alta: "warn",
  urgente: "danger",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

/** Colunas do Kanban de ofertas, na ordem do processo de producao. */
export const OFFER_KANBAN_COLUMNS: OfferStatus[] = [
  "minerada",
  "pre_analise",
  "aprovada",
  "modelagem",
  "copy",
  "criativos",
  "pagina",
  "configuracao",
  "pronta",
  "testando",
  "validada",
  "escalando",
  "pausada",
  "morta",
];
