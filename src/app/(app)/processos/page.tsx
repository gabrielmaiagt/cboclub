import { ProcessosView } from "@/features/processos/components/processos-view";
import { requireAuth } from "@/lib/auth/guard";
import { listProcesses } from "@/services/firestore/tools.repo";

export const metadata = { title: "Processos" };
export const dynamic = "force-dynamic";

/** Processos (§51) — nunca "SOPs" na interface. */
export default async function ProcessosPage() {
  const ctx = await requireAuth();
  const processes = await listProcesses();

  return <ProcessosView processes={processes} role={ctx.role} />;
}
