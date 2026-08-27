import "server-only";

import { cookies } from "next/headers";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import {
  canRead,
  canWrite,
  isAdmin,
  isOwner,
  type ReadGroup,
  type WriteGroup,
} from "@/lib/auth/permissions";
import type { AppRole, User } from "@/types/domain";

/**
 * Guarda de autorizacao do servidor.
 *
 * O Admin SDK ignora as Security Rules — quem escreve por ele passa por
 * cima de tudo que esta em firestore.rules. Entao TODA server action
 * comeca chamando um `require*` daqui. Sem excecao.
 *
 * Este arquivo e o unico lugar do projeto que decide "esta pessoa pode?".
 * Duplicar essa decisao em outro lugar e como o check fica inconsistente.
 */

export const SESSION_COOKIE = "x1_session";
/** 5 dias. O cookie e httpOnly e revalidado a cada request. */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "unauthenticated" | "forbidden" | "inactive"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthContext {
  uid: string;
  email: string | null;
  role: AppRole;
  user: User;
}

function toUser(uid: string, data: FirebaseFirestore.DocumentData): User {
  return {
    id: uid,
    email: data.email ?? null,
    fullName: data.fullName ?? "",
    avatarUrl: data.avatarUrl ?? null,
    role: data.role as AppRole,
    active: data.active !== false,
    claimsUpdatedAt: data.claimsUpdatedAt?.toDate?.()?.toISOString() ?? null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
}

/**
 * Le a sessao e devolve o contexto, ou null se nao houver login valido.
 * Nao lanca — use quando a ausencia de sessao e um caso esperado
 * (ex.: decidir entre renderizar o app ou redirecionar para /login).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  let uid: string;
  let email: string | null;
  try {
    // checkRevoked: uma sessao revogada (logout em outro device,
    // desativacao da conta) para de valer imediatamente.
    const decoded = await adminAuth().verifySessionCookie(session, true);
    uid = decoded.uid;
    email = decoded.email ?? null;
  } catch {
    return null;
  }

  const snap = await adminDb().collection(COL.users).doc(uid).get();
  if (!snap.exists) return null;

  const user = toUser(uid, snap.data()!);
  if (!user.active) return null;

  // O papel vem do Firestore, nao do claim do token: o claim pode estar
  // defasado ate o cliente renovar o token, o documento nunca esta.
  return { uid, email, role: user.role, user };
}

/** Exige login. Lanca AuthError se nao houver sessao valida. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new AuthError("Faça login para continuar.", "unauthenticated");
  }
  return ctx;
}

/** Exige permissao de escrita num grupo. */
export async function requireWrite(group: WriteGroup): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canWrite(ctx.role, group)) {
    throw new AuthError(
      `Seu papel (${ctx.role}) não pode alterar este recurso.`,
      "forbidden"
    );
  }
  return ctx;
}

/** Exige permissao de leitura restrita. */
export async function requireRead(group: ReadGroup): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!canRead(ctx.role, group)) {
    throw new AuthError(
      `Seu papel (${ctx.role}) não pode ver este recurso.`,
      "forbidden"
    );
  }
  return ctx;
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!isAdmin(ctx.role)) {
    throw new AuthError("Apenas owner ou admin.", "forbidden");
  }
  return ctx;
}

export async function requireOwner(): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!isOwner(ctx.role)) {
    throw new AuthError("Apenas o owner.", "forbidden");
  }
  return ctx;
}

/** Exige um papel especifico dentre os listados. */
export async function requireRole(
  ...roles: AppRole[]
): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.role)) {
    throw new AuthError(
      `Requer um destes papéis: ${roles.join(", ")}.`,
      "forbidden"
    );
  }
  return ctx;
}
