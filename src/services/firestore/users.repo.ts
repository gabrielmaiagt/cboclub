import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/collections";
import { tsToIso } from "@/services/firestore/converters";
import type { AppRole, User } from "@/types/domain";

function toUser(doc: FirebaseFirestore.DocumentSnapshot): User {
  const d = doc.data()!;
  const now = new Date().toISOString();
  return {
    id: doc.id,
    email: d.email ?? null,
    fullName: d.fullName ?? "",
    avatarUrl: d.avatarUrl ?? null,
    role: (d.role ?? "viewer") as AppRole,
    active: d.active !== false,
    claimsUpdatedAt: tsToIso(d.claimsUpdatedAt),
    createdAt: tsToIso(d.createdAt) ?? now,
    updatedAt: tsToIso(d.updatedAt) ?? now,
  };
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await adminDb().collection(COL.users).doc(uid).get();
  return snap.exists ? toUser(snap) : null;
}

export async function listUsers(): Promise<User[]> {
  const snap = await adminDb().collection(COL.users).orderBy("fullName").get();
  return snap.docs.map(toUser);
}

/**
 * Cria ou atualiza o profile no primeiro login.
 *
 * O PRIMEIRO usuario do sistema vira owner — e assim que a operacao sai
 * do zero sem precisar de um script de bootstrap. Todos os demais entram
 * como viewer e precisam ser promovidos por um owner em /usuarios.
 *
 * O papel nunca vem do cliente: quem chama pode informar nome e email,
 * nunca `role`.
 */
export async function ensureProfile(params: {
  uid: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}): Promise<User> {
  const db = adminDb();
  const ref = db.collection(COL.users).doc(params.uid);

  const role = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (snap.exists) {
      tx.update(ref, {
        email: params.email ?? snap.data()?.email ?? null,
        fullName: params.fullName?.trim() || snap.data()?.fullName || "",
        avatarUrl: params.avatarUrl ?? snap.data()?.avatarUrl ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return (snap.data()?.role ?? "viewer") as AppRole;
    }

    // Conta quantos usuarios ja existem para decidir o papel inicial.
    const existing = await tx.get(db.collection(COL.users).limit(1));
    const assigned: AppRole = existing.empty ? "owner" : "viewer";

    tx.set(ref, {
      email: params.email,
      fullName:
        params.fullName?.trim() || params.email?.split("@")[0] || "Sem nome",
      avatarUrl: params.avatarUrl,
      role: assigned,
      active: true,
      claimsUpdatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return assigned;
  });

  await syncClaims(params.uid, role);

  const created = await getUser(params.uid);
  if (!created) throw new Error("Falha ao criar o perfil do usuário.");
  return created;
}

/**
 * Espelha o papel no custom claim do token.
 *
 * As Security Rules leem `request.auth.token.role`, o que custa zero
 * leitura por avaliacao. O documento continua sendo a fonte da verdade
 * para o servidor; o claim e uma copia para as regras.
 */
export async function syncClaims(uid: string, role: AppRole): Promise<void> {
  await adminAuth().setCustomUserClaims(uid, { role });
  await adminDb()
    .collection(COL.users)
    .doc(uid)
    .update({ claimsUpdatedAt: FieldValue.serverTimestamp() });
}

/**
 * Altera o papel de um usuario.
 *
 * Duas garantias que as Security Rules nao conseguem dar, porque exigem
 * contar documentos:
 *   1. ninguem altera o proprio papel
 *   2. o ultimo owner ativo nao pode ser rebaixado
 */
export async function setUserRole(params: {
  targetUid: string;
  role: AppRole;
  actorUid: string;
}): Promise<void> {
  if (params.targetUid === params.actorUid) {
    throw new Error("Você não pode alterar o próprio papel.");
  }

  const db = adminDb();
  const ref = db.collection(COL.users).doc(params.targetUid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Usuário não encontrado.");

    const current = (snap.data()?.role ?? "viewer") as AppRole;
    if (current === params.role) return;

    if (current === "owner" && params.role !== "owner") {
      const owners = await tx.get(
        db.collection(COL.users).where("role", "==", "owner").where("active", "==", true)
      );
      const remaining = owners.docs.filter((d) => d.id !== params.targetUid);
      if (remaining.length === 0) {
        throw new Error("O sistema precisa de pelo menos um owner ativo.");
      }
    }

    tx.update(ref, {
      role: params.role,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: params.actorUid,
    });
  });

  await syncClaims(params.targetUid, params.role);
  // Invalida os tokens em circulacao para o papel novo valer de imediato
  await adminAuth().revokeRefreshTokens(params.targetUid);
}

export async function setUserActive(params: {
  targetUid: string;
  active: boolean;
  actorUid: string;
}): Promise<void> {
  if (params.targetUid === params.actorUid) {
    throw new Error("Você não pode desativar a si mesmo.");
  }

  const db = adminDb();
  const ref = db.collection(COL.users).doc(params.targetUid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Usuário não encontrado.");

    if ((snap.data()?.role as AppRole) === "owner" && !params.active) {
      const owners = await tx.get(
        db.collection(COL.users).where("role", "==", "owner").where("active", "==", true)
      );
      const remaining = owners.docs.filter((d) => d.id !== params.targetUid);
      if (remaining.length === 0) {
        throw new Error("O sistema precisa de pelo menos um owner ativo.");
      }
    }

    tx.update(ref, {
      active: params.active,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: params.actorUid,
    });
  });

  if (!params.active) {
    await adminAuth().revokeRefreshTokens(params.targetUid);
  }
}

/** Mapa uid -> nome, para as telas resolverem responsavel sem N leituras. */
export async function getUserDirectory(): Promise<Map<string, User>> {
  const users = await listUsers();
  return new Map(users.map((u) => [u.id, u]));
}
