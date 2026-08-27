import { FerramentasView } from "@/features/ferramentas/components/ferramentas-view";
import { requireAuth } from "@/lib/auth/guard";
import { listTools } from "@/services/firestore/tools.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const metadata = { title: "Ferramentas" };
export const dynamic = "force-dynamic";

/** Ferramentas (§50): custo mensal e renovacao. Nunca senha. */
export default async function FerramentasPage() {
  const ctx = await requireAuth();
  const [tools, users] = await Promise.all([listTools(), listUsers()]);

  return (
    <FerramentasView
      tools={tools}
      users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName }))}
      role={ctx.role}
    />
  );
}
