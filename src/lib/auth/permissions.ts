/**
 * Matriz de permissoes — fonte unica de verdade.
 *
 * Espelhada em tres lugares, e os tres precisam concordar:
 *   1. aqui (server actions, via requireWrite)
 *   2. aqui (UI, para esconder botoes que o usuario nao pode usar)
 *   3. firestore.rules (para o acesso direto do cliente ao Firestore)
 *
 * Ao mudar qualquer grupo abaixo, atualize firestore.rules junto.
 * Modulo puro: sem import de firebase, roda no cliente e no servidor.
 */
import type { AppRole } from "@/types/domain";

/**
 * Grupos de escrita. Espelham o §3 do documento de produto.
 */
export const WRITE_GROUPS = {
  /** Ofertas, angulos, paginas, campanhas, decisoes */
  offers: ["owner", "admin", "trafego"],
  /** Metricas diarias, testes, mineracao */
  traffic: ["owner", "admin", "trafego"],
  /** Criativos, copies e versoes */
  creative: ["owner", "admin", "criativo", "trafego"],
  /** Chips, eventos e o numero real */
  ops: ["owner", "admin", "operacao"],
  /** Ledger e socios */
  finance: ["owner", "admin"],
  /** SOPs, ferramentas, settings, taxonomia */
  admin: ["owner", "admin"],
  /** Papeis de usuario */
  owner: ["owner"],
} as const satisfies Record<string, readonly AppRole[]>;

export type WriteGroup = keyof typeof WRITE_GROUPS;

/**
 * Grupos de leitura restrita. O que nao esta aqui e legivel por qualquer
 * usuario ativo.
 */
export const READ_GROUPS = {
  /** Despesas: trafego precisa ver custo para calcular ROI */
  expenses: ["owner", "admin", "trafego"],
  /** Receitas, aportes, distribuicoes, socios */
  finance: ["owner", "admin"],
  /** Numero real do chip */
  chipSecret: ["owner", "admin", "operacao"],
} as const satisfies Record<string, readonly AppRole[]>;

export type ReadGroup = keyof typeof READ_GROUPS;

export function canWrite(role: AppRole | null, group: WriteGroup): boolean {
  if (!role) return false;
  return (WRITE_GROUPS[group] as readonly AppRole[]).includes(role);
}

export function canRead(role: AppRole | null, group: ReadGroup): boolean {
  if (!role) return false;
  return (READ_GROUPS[group] as readonly AppRole[]).includes(role);
}

export function isAdmin(role: AppRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function isOwner(role: AppRole | null): boolean {
  return role === "owner";
}

/** Viewer le tudo que nao e restrito, mas nao escreve nada. */
export function isViewer(role: AppRole | null): boolean {
  return role === "viewer";
}
