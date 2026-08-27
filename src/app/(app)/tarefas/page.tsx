import { TasksView } from "@/features/tasks/components/tasks-view";
import type { TaskRow } from "@/features/tasks/types";
import { requireAuth } from "@/lib/auth/guard";
import { listOffers } from "@/services/firestore/offers.repo";
import { listDecisions, listTasks } from "@/services/firestore/tasks.repo";
import { listUsers } from "@/services/firestore/users.repo";
import { isAdmin } from "@/lib/auth/permissions";

export const metadata = { title: "Tarefas" };
export const dynamic = "force-dynamic";

/**
 * Tarefas (§45-§48): extremamente simples. Owner/admin veem tudo;
 * os demais tem as proprias priorizadas em "Meu Dia".
 */
export default async function TasksPage() {
  const ctx = await requireAuth();

  const [tasks, decisions, offers, users] = await Promise.all([
    listTasks(),
    listDecisions({ status: "aberta" }),
    listOffers(),
    listUsers(),
  ]);

  const userNames = new Map(users.map((u) => [u.id, u.fullName]));
  const offerByIdCode = new Map(offers.map((o) => [o.id, o.code]));

  const rows: TaskRow[] = tasks.map((task) => ({
    task,
    responsibleName: task.responsibleId ? (userNames.get(task.responsibleId) ?? null) : null,
    offerCode: task.offerId ? (offerByIdCode.get(task.offerId) ?? null) : null,
  }));

  return (
    <TasksView
      data={{
        rows,
        decisions,
        offers: offers.map((o) => ({ id: o.id, code: o.code, name: o.name })),
        users: users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName })),
        currentUid: ctx.uid,
      }}
      isAdmin={isAdmin(ctx.role)}
    />
  );
}
