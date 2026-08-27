import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK.
 *
 * ATENCAO: o Admin SDK IGNORA as Security Rules. Toda operacao feita por
 * aqui precisa validar autenticacao e papel explicitamente no servidor,
 * via `src/lib/auth/guard.ts`. Nunca chame estas funcoes direto de uma
 * server action sem passar por um `require*` antes.
 */

const ADMIN_APP_NAME = "x1-admin";

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    const parsed = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      // Chaves vindas de .env vem com \n escapado
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    });
  }
  // Sem service account: usa Application Default Credentials.
  // E o caminho no App Hosting e nos emuladores.
  return undefined;
}

function createAdminApp(): App {
  const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const credential = loadCredential();
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Falhar alto: sem projectId o emulador aceita a escrita num namespace
  // "fantasma" de outro projeto e os dados somem da visao da aplicacao.
  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID/NEXT_PUBLIC_FIREBASE_PROJECT_ID nao definido — " +
        "recuso a inicializar o Admin SDK sem projeto explicito."
    );
  }

  return initializeApp(
    credential ? { credential, projectId } : { projectId },
    ADMIN_APP_NAME
  );
}

export function adminApp(): App {
  try {
    return getApp(ADMIN_APP_NAME);
  } catch {
    return createAdminApp();
  }
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

// Cache em globalThis: um modulo recarregado pelo HMR perde variaveis
// locais, mas a instancia do Firestore sobrevive no app singleton — e
// settings() so pode ser chamado uma vez por instancia.
declare global {
  // eslint-disable-next-line no-var
  var __adminFirestore: Firestore | undefined;
}

export function adminDb(): Firestore {
  if (!globalThis.__adminFirestore) {
    const instance = getFirestore(adminApp());
    instance.settings({ ignoreUndefinedProperties: true });
    globalThis.__adminFirestore = instance;
  }
  return globalThis.__adminFirestore;
}
