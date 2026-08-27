import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/guard";
import { ensureProfile } from "@/services/firestore/users.repo";

/**
 * Endpoint de sessao PARA TESTE AUTOMATIZADO, somente em desenvolvimento
 * com emulador. Espelha o que a server action createSession faz, mas e
 * invocavel por HTTP puro — server actions exigem o action-id do bundle,
 * que um script externo nao tem.
 *
 * Guarda dupla: fora de development OU sem emulador de Auth configurado,
 * responde 404 e nao executa nada. Nunca chega em producao ativo.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (
    process.env.NODE_ENV !== "development" ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { idToken } = (await request.json()) as { idToken?: string };
  if (!idToken) {
    return NextResponse.json({ error: "idToken obrigatório" }, { status: 400 });
  }

  const decoded = await adminAuth().verifyIdToken(idToken, true);
  await ensureProfile({
    uid: decoded.uid,
    email: decoded.email ?? null,
    fullName: (decoded.name as string | undefined) ?? null,
    avatarUrl: null,
  });

  const sessionCookie = await adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}
