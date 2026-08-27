"use server";

import { cookies } from "next/headers";

import {
  AuthError,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  getAuthContext,
  requireOwner,
} from "@/lib/auth/guard";
import { adminAuth } from "@/lib/firebase/admin";
import {
  ensureProfile,
  listUsers,
  setUserActive,
  setUserRole,
} from "@/services/firestore/users.repo";
import { APP_ROLES, type AppRole, type User } from "@/types/domain";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

function fail(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Erro inesperado." };
}

/**
 * Troca o ID token do Firebase por um cookie de sessao httpOnly.
 *
 * O ID token dura 1h e fica acessivel ao JavaScript; o cookie de sessao
 * dura 5 dias, e httpOnly (fora do alcance de XSS) e pode ser revogado
 * no servidor. Este e o unico ponto onde a sessao nasce.
 */
export async function createSession(idToken: string): Promise<ActionResult<User>> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    // Cria o profile no primeiro login. O primeiro usuario vira owner.
    const user = await ensureProfile({
      uid: decoded.uid,
      email: decoded.email ?? null,
      fullName: (decoded.name as string | undefined) ?? null,
      avatarUrl: (decoded.picture as string | undefined) ?? null,
    });

    if (!user.active) {
      return { ok: false, error: "Sua conta está desativada. Fale com o owner." };
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return { ok: true, data: user };
  } catch (error) {
    return fail(error);
  }
}

export async function destroySession(): Promise<ActionResult> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;

  if (existing) {
    try {
      const decoded = await adminAuth().verifySessionCookie(existing, false);
      // Invalida em todos os dispositivos, nao so neste navegador
      await adminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // Cookie ja invalido: seguir e limpar mesmo assim
    }
  }

  store.delete(SESSION_COOKIE);
  return { ok: true };
}

/** Usuario da sessao atual, ou null. Usado pelo layout. */
export async function getCurrentUser(): Promise<User | null> {
  const ctx = await getAuthContext();
  return ctx?.user ?? null;
}

// ── Gestao de usuarios (/usuarios) ──────────────────────────────────

export async function listUsersAction(): Promise<ActionResult<User[]>> {
  try {
    await requireOwner();
    return { ok: true, data: await listUsers() };
  } catch (error) {
    return fail(error);
  }
}

export async function setUserRoleAction(
  targetUid: string,
  role: string
): Promise<ActionResult> {
  try {
    const ctx = await requireOwner();

    if (!APP_ROLES.includes(role as AppRole)) {
      return { ok: false, error: `Papel inválido: ${role}` };
    }

    await setUserRole({
      targetUid,
      role: role as AppRole,
      actorUid: ctx.uid,
    });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setUserActiveAction(
  targetUid: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const ctx = await requireOwner();
    await setUserActive({ targetUid, active, actorUid: ctx.uid });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
