/**
 * Nomes das collections. Importar daqui em vez de escrever string solta
 * evita divergencia entre repositories, seed e Security Rules.
 */
export const COL = {
  users: "users",
  settings: "settings",
  counters: "counters",
  offers: "offers",
  scripts: "scripts",
  creatives: "creatives",
  dailyMetrics: "dailyMetrics",
  creativeMetrics: "creativeMetrics",
  experiments: "experiments",
  chips: "chips",
  miningItems: "miningItems",
  partners: "partners",
  ledger: "ledger",
  decisions: "decisions",
  tasks: "tasks",
  sops: "sops",
  tools: "tools",
  activity: "activity",
} as const;

/** Subcollections. */
export const SUB = {
  scriptVersions: "versions",
  chipEvents: "events",
  chipSecret: "secret",
} as const;

/** Docs de id fixo. */
export const DOC = {
  settingsApp: "app",
  settingsTaxonomy: "taxonomy",
  chipSecretPhone: "phone",
} as const;

/** Entidades que possuem contador de codigo sequencial. */
export const COUNTER_KEYS = {
  offers: "offers",
  creatives: "creatives",
  scripts: "scripts",
  experiments: "experiments",
  chips: "chips",
  mining: "mining",
} as const;

export type CounterKey = (typeof COUNTER_KEYS)[keyof typeof COUNTER_KEYS];

/** Prefixo e largura do codigo por entidade. OFFER-0001, CHIP-001... */
export const CODE_FORMAT: Record<CounterKey, { prefix: string; width: number }> = {
  offers: { prefix: "OFFER", width: 4 },
  creatives: { prefix: "CR", width: 4 },
  scripts: { prefix: "CP", width: 4 },
  experiments: { prefix: "TEST", width: 4 },
  chips: { prefix: "CHIP", width: 3 },
  mining: { prefix: "MIN", width: 4 },
};

export function formatCode(key: CounterKey, seq: number): string {
  const { prefix, width } = CODE_FORMAT[key];
  return `${prefix}-${String(seq).padStart(width, "0")}`;
}
