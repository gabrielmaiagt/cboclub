import { EquipeView } from "@/features/equipe/components/equipe-view";
import { requireAuth } from "@/lib/auth/guard";
import { listUsers } from "@/services/firestore/users.repo";

export const metadata = { title: "Equipe" };
export const dynamic = "force-dynamic";

/** Equipe (§49): quem tem acesso e com qual papel. */
export default async function EquipePage() {
  const ctx = await requireAuth();
  const users = await listUsers();

  return <EquipeView users={users} currentUid={ctx.uid} role={ctx.role} />;
}
