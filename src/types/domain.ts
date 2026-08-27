/**
 * Tipos de dominio.
 *
 * Esta camada nao conhece Firestore. Nenhum import de `firebase/*` pode
 * aparecer neste arquivo — as telas dependem daqui, nao do banco.
 * Datas sao `string` no formato ISO ou 'YYYY-MM-DD', nunca Timestamp.
 */

// ── Papeis ──────────────────────────────────────────────────────────
export const APP_ROLES = [
  "owner",
  "admin",
  "trafego",
  "criativo",
  "operacao",
  "viewer",
] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin / Sócio",
  trafego: "Tráfego",
  criativo: "Criativo",
  operacao: "Operação",
  viewer: "Viewer",
};

// ── Enums operacionais ──────────────────────────────────────────────
export const OFFER_STATUSES = [
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
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  minerada: "Minerada",
  pre_analise: "Pré-análise",
  aprovada: "Aprovada",
  modelagem: "Modelagem",
  copy: "Copy",
  criativos: "Criativos",
  pagina: "Página",
  configuracao: "Configuração",
  pronta: "Pronta",
  testando: "Testando",
  validada: "Validada",
  escalando: "Escalando",
  pausada: "Pausada",
  morta: "Morta",
};

/** Etapas em que a oferta ainda esta sendo produzida (Fila de Lancamento). */
export const OFFER_PRODUCTION_STATUSES: OfferStatus[] = [
  "aprovada",
  "modelagem",
  "copy",
  "criativos",
  "pagina",
  "configuracao",
];

/** Etapas em que a oferta esta no ar gastando dinheiro. */
export const OFFER_LIVE_STATUSES: OfferStatus[] = [
  "testando",
  "validada",
  "escalando",
];

export const OFFER_HEALTHS = ["saudavel", "atencao", "critico"] as const;
export type OfferHealth = (typeof OFFER_HEALTHS)[number];

export const PRIORITIES = ["baixa", "media", "alta", "urgente"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ANGLE_STATUSES = [
  "ideia",
  "testando",
  "vencedor",
  "neutro",
  "perdedor",
] as const;
export type AngleStatus = (typeof ANGLE_STATUSES)[number];

export const CREATIVE_STATUSES = [
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
] as const;
export type CreativeStatus = (typeof CREATIVE_STATUSES)[number];

export const SCRIPT_STATUSES = [
  "rascunho",
  "revisao",
  "aprovado",
  "em_uso",
  "arquivado",
] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

export const EXPERIMENT_STATUSES = [
  "planejado",
  "rodando",
  "pausado",
  "concluido",
  "cancelado",
] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const EXPERIMENT_RESULTS = [
  "vencedor",
  "perdedor",
  "neutro",
  "inconclusivo",
] as const;
export type ExperimentResult = (typeof EXPERIMENT_RESULTS)[number];

export const EXPERIMENT_VARIABLES = [
  "oferta",
  "promessa",
  "preco",
  "pagina",
  "headline",
  "angulo",
  "hook",
  "copy",
  "criativo",
  "cta",
  "publico",
  "campanha",
  "upsell",
] as const;
export type ExperimentVariable = (typeof EXPERIMENT_VARIABLES)[number];

export const CHIP_STATUSES = [
  "novo",
  "aquecendo",
  "pronto",
  "ativo",
  "reserva",
  "indisponivel",
  "arquivado",
] as const;
export type ChipStatus = (typeof CHIP_STATUSES)[number];

export const CHIP_EVENT_TYPES = [
  "compra",
  "aquecimento_iniciado",
  "pronto",
  "vinculado_oferta",
  "desvinculado_oferta",
  "reserva",
  "banido",
  "indisponivel",
  "arquivado",
  "nota",
] as const;
export type ChipEventType = (typeof CHIP_EVENT_TYPES)[number];

export const MINING_STATUSES = [
  "encontrada",
  "analisar",
  "interessante",
  "aprovada",
  "modelar",
  "descartada",
  "convertida",
] as const;
export type MiningStatus = (typeof MINING_STATUSES)[number];

export const TRAFFIC_PLATFORMS = [
  "meta",
  "google",
  "tiktok",
  "kwai",
  "outro",
] as const;
export type TrafficPlatform = (typeof TRAFFIC_PLATFORMS)[number];

export const CAMPAIGN_STATUSES = [
  "rascunho",
  "ativa",
  "pausada",
  "encerrada",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const PAGE_STATUSES = [
  "rascunho",
  "no_ar",
  "pausada",
  "arquivada",
] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

export const TASK_STATUSES = [
  "backlog",
  "fazer",
  "fazendo",
  "revisao",
  "concluido",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const DECISION_TYPES = [
  "otimizacao",
  "escala",
  "corte",
  "teste",
  "financeiro",
  "operacional",
  "outro",
] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

export const DECISION_STATUSES = [
  "aberta",
  "em_andamento",
  "resolvida",
  "descartada",
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  "meta_ads",
  "funcionarios",
  "freelancer",
  "chips",
  "ferramentas",
  "dominios",
  "hospedagem",
  "gateway",
  "criativos",
  "infraestrutura",
  "outros",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Ja contabilizadas em dailyMetrics — entram no ledger sem somar no P&L. */
export const NON_PNL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "meta_ads",
  "gateway",
];

export const REVENUE_SOURCES = [
  "afiliado",
  "consultoria",
  "reembolso_recebido",
  "outro",
] as const;
export type RevenueSource = (typeof REVENUE_SOURCES)[number];

export const LEDGER_KINDS = [
  "expense",
  "revenue",
  "contribution",
  "distribution",
] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export const SOP_CATEGORIES = [
  "mineracao",
  "copy",
  "criativos",
  "pagina",
  "chips",
  "trafego",
  "teste",
  "escala",
  "financeiro",
  "geral",
] as const;
export type SopCategory = (typeof SOP_CATEGORIES)[number];

export const TOOL_CATEGORIES = [
  "ia",
  "edicao",
  "transcricao",
  "trafego",
  "tracking",
  "hospedagem",
  "dominio",
  "whatsapp",
  "checkout",
  "spy",
  "produtividade",
  "outros",
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

// ── Blocos comuns ───────────────────────────────────────────────────
export interface AuditFields {
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  /** Soft delete. Nasce SEMPRE explicitamente null — nunca omitido. */
  deletedAt: string | null;
}

// ── Entidades ───────────────────────────────────────────────────────
export interface User {
  /** Doc id = uid do Firebase Auth. */
  id: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: AppRole;
  active: boolean;
  claimsUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Angle {
  id: string;
  name: string;
  description: string | null;
  hypothesis: string | null;
  status: AngleStatus;
  result: string | null;
}

export interface LandingPage {
  id: string;
  name: string;
  version: string;
  url: string | null;
  status: PageStatus;
  headline: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  platform: TrafficPlatform;
  account: string | null;
  externalId: string | null;
  status: CampaignStatus;
  startDate: string | null;
  responsibleId: string | null;
}

export interface Offer extends AuditFields {
  id: string;
  code: string;
  name: string;
  niche: string | null;
  subNiche: string | null;
  country: string;
  language: string;
  mainPromise: string | null;
  mechanism: string | null;
  targetAudience: string | null;
  ticketPrice: number | null;
  status: OfferStatus;
  health: OfferHealth;
  priority: Priority;
  responsibleId: string | null;
  miningItemId: string | null;
  nextAction: string | null;
  nextActionDue: string | null;
  launchDate: string | null;
  validationDate: string | null;
  scalingDate: string | null;
  notes: string | null;
  angles: Angle[];
  pages: LandingPage[];
  campaigns: Campaign[];
}

/**
 * Metrica consolidada da OFERTA por dia.
 * Doc id = `${date}_${offerId}`. Sem granularidade por campanha no MVP.
 * Guarda apenas dados-base: nada de CTR/CPA/ROAS persistido.
 */
export interface DailyMetric {
  id: string;
  date: string;
  offerId: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  refunds: number;
  gatewayFees: number;
  additionalCosts: number;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ActivityEntry {
  id: string;
  actorId: string | null;
  /** Snapshot historico: correto que nao mude se a pessoa for renomeada. */
  actorName: string | null;
  entityType: string;
  entityId: string;
  entityCode: string | null;
  offerId: string | null;
  action: "created" | "updated" | "status_changed" | "deleted";
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string;
  createdAt: string;
}

export interface AppSettings {
  copyWordsPerMinute: number;
  chipsTarget: number;
  currency: string;
  defaultCountry: string;
}

export interface CreativeFormat {
  slug: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Tag {
  slug: string;
  name: string;
  color: string;
}

export interface LibraryAngle {
  slug: string;
  name: string;
  description: string | null;
}

export interface Taxonomy {
  creativeFormats: CreativeFormat[];
  tags: Tag[];
  angleLibrary: LibraryAngle[];
}

/**
 * Criativo.
 *
 * `scriptId` + `scriptVersion` apontam para a copy E a versao especifica
 * usada — se a copy ganhar uma V3 depois, o criativo continua registrando
 * que foi gravado sobre a V2.
 */
export interface Creative extends AuditFields {
  id: string;
  code: string;
  offerId: string;
  angleId: string | null;
  scriptId: string | null;
  scriptVersion: number | null;
  title: string;
  hook: string | null;
  /** Slug de settings/taxonomy.creativeFormats. */
  format: string | null;
  platform: TrafficPlatform;
  durationSeconds: number | null;
  editorId: string | null;
  responsibleId: string | null;
  status: CreativeStatus;
  /** Caminho no Firebase Storage (creatives/{offerId}/...). */
  storagePath: string | null;
  thumbnailPath: string | null;
  sourceUrl: string | null;
  inspirationUrl: string | null;
  /** Slugs de settings/taxonomy.tags. */
  tags: string[];
  notes: string | null;
  editedAt: string | null;
  approvedAt: string | null;
  launchedAt: string | null;
}

// ── Referencias externas (swipe file) ───────────────────────────────
export const REFERENCE_STATUSES = [
  "salvo",
  "modelar",
  "modelado",
  "descartado",
] as const;
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];

/**
 * Criativo de REFERENCIA: anuncio de terceiros salvo para modelar.
 * Nunca se mistura com `creatives` (nossos ativos internos).
 * A transcricao original NUNCA e sobrescrita pela nossa versao — a
 * modelagem vira um Script novo com sourceReferenceId apontando pra ca.
 */
export interface CreativeReference extends AuditFields {
  id: string;
  code: string; // REF-CR-0001
  url: string | null;
  storagePath: string | null;
  /** Texto exatamente como veio do anuncio externo. Imutavel na pratica. */
  transcription: string | null;
  /** Anotacao rapida: por que salvei isso? */
  whySaved: string | null;
  /** Analise aprofundada, opcional, feita depois. */
  analysis: string | null;
  miningItemId: string | null;
  status: ReferenceStatus;
  // Metadados opcionais, adicionados depois sem bloquear o fluxo
  advertiser: string | null;
  format: string | null;
  source: string | null; // Biblioteca Meta, TikTok, spy...
  notes: string | null;
}

/** Oferta minerada — banco de ofertas de terceiros (§13). */
export interface MiningItem extends AuditFields {
  id: string;
  code: string; // MIN-0001
  name: string;
  url: string | null;
  whyInteresting: string | null;
  status: MiningStatus;
  niche: string | null;
  promise: string | null;
  mechanism: string | null;
  price: number | null;
  advertiser: string | null;
  notes: string | null;
  convertedOfferId: string | null;
}

/** Conteudo de uma versao de copy. Imutavel depois de criado (§20). */
export interface ScriptVersionData {
  version: number;
  hook: string | null;
  body: string;
  cta: string | null;
  wordCount: number;
  estimatedDurationSeconds: number;
  changeNote: string | null;
  createdAt: string;
  createdBy: string | null;
}

/**
 * Copy. O conteudo vive nas versoes (subcollection `versions/v{n}`);
 * `current` e um snapshot da versao mais recente para a listagem nao
 * precisar ler a subcollection.
 */
export interface Script extends AuditFields {
  id: string;
  code: string;
  offerId: string;
  angleId: string | null;
  title: string;
  status: ScriptStatus;
  currentVersion: number;
  responsibleId: string | null;
  notes: string | null;
  current: ScriptVersionData;
  // ── Briefing de producao (§4) — tudo opcional ─────────────────────
  /** Formato sugerido ao editor (slug da taxonomia). */
  suggestedFormat: string | null;
  /** Instrucoes de edicao para o editor. */
  editingInstructions: string | null;
  /** Links de referencia, um por linha. */
  referenceLinks: string | null;
  /** Prazo de producao (YYYY-MM-DD). */
  deadline: string | null;
  /** Referencia externa que originou esta copy (modelagem, §12). */
  sourceReferenceId: string | null;
}

// ── Entrada de escrita ──────────────────────────────────────────────
export type OfferCreateInput = Omit<
  Offer,
  keyof AuditFields | "id" | "code" | "angles" | "pages" | "campaigns"
> & {
  angles?: Angle[];
  pages?: LandingPage[];
  campaigns?: Campaign[];
};

export type OfferUpdateInput = Partial<
  Omit<Offer, keyof AuditFields | "id" | "code">
>;
