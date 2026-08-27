"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, ListChecks, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { changeTaskStatusAction, createTaskAction } from "@/app/actions/tasks";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskRow, TasksData } from "@/features/tasks/types";
import { businessDate, relativeDeadline } from "@/lib/format";
import { PRIORITY_LABELS, PRIORITY_TONE, TONE_DOT } from "@/lib/status";
import { cn } from "@/lib/utils";
import { PRIORITIES } from "@/types/domain";

const NONE = "__none__";

function TaskItem({ row, onToggle, pending }: { row: TaskRow; onToggle: (id: string, done: boolean) => void; pending: boolean }) {
  const done = row.task.status === "concluido";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5">
      <Checkbox checked={done} disabled={pending} onCheckedChange={(v) => onToggle(row.task.id, v === true)} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", done && "text-muted-foreground line-through")}>
          {row.task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {row.responsibleName && <span>{row.responsibleName}</span>}
          {row.offerCode && (
            <Link href={`/ofertas/${row.offerCode}`} className="hover:underline">
              {row.offerCode}
            </Link>
          )}
        </div>
      </div>
      <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[PRIORITY_TONE[row.task.priority]])} title={PRIORITY_LABELS[row.task.priority]} />
      {row.task.deadline && (
        <span className="shrink-0 text-xs text-muted-foreground">{relativeDeadline(row.task.deadline)}</span>
      )}
    </div>
  );
}

export function TasksView({ data, isAdmin }: { data: TasksData; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [onlyMine, setOnlyMine] = useState(!isAdmin);
  const [form, setForm] = useState({
    title: "",
    responsibleId: NONE,
    deadline: "",
    priority: "media",
    offerId: NONE,
  });

  const today = businessDate();
  const visible = onlyMine
    ? data.rows.filter((r) => r.task.responsibleId === data.currentUid)
    : data.rows;

  const active = visible.filter((r) => r.task.status !== "concluido");
  const overdue = active.filter((r) => r.task.deadline && r.task.deadline < today);
  const dueToday = active.filter((r) => r.task.deadline === today);
  const upcoming = active.filter((r) => !r.task.deadline || r.task.deadline > today);
  const completed = useMemo(
    () => visible.filter((r) => r.task.status === "concluido").slice(0, 10),
    [visible]
  );

  function toggle(id: string, done: boolean) {
    startTransition(async () => {
      const result = await changeTaskStatusAction({ id, status: done ? "concluido" : "fazer" });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível atualizar.");
        return;
      }
      router.refresh();
    });
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createTaskAction({
        title: form.title.trim(),
        responsibleId: form.responsibleId === NONE ? null : form.responsibleId,
        deadline: form.deadline || null,
        priority: form.priority,
        offerId: form.offerId === NONE ? null : form.offerId,
        status: "fazer",
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível criar.");
        return;
      }
      toast.success("Tarefa criada");
      setFormOpen(false);
      setForm({ title: "", responsibleId: NONE, deadline: "", priority: "media", offerId: NONE });
      router.refresh();
    });
  }

  const addButton = (
    <Button onClick={() => setFormOpen(true)} className="gap-2">
      <Plus className="size-4" />
      Nova Tarefa
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        description="O que precisa ser feito, sem virar Jira."
        action={addButton}
      >
        {isAdmin && (
          <div className="flex items-center rounded-lg border border-border/60 p-1 w-fit">
            <button
              onClick={() => setOnlyMine(true)}
              className={cn("h-8 rounded-md px-3 text-sm transition-colors", onlyMine ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground")}
            >
              Meu dia
            </button>
            <button
              onClick={() => setOnlyMine(false)}
              className={cn("h-8 rounded-md px-3 text-sm transition-colors", !onlyMine ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground")}
            >
              Todas
            </button>
          </div>
        )}
      </PageHeader>

      {active.length === 0 && completed.length === 0 ? (
        <EmptyState icon={<ListChecks className="size-8" />} title="Nenhuma tarefa" action={addButton} />
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-status-danger">Vencidas</h3>
              <div className="space-y-1.5">
                {overdue.map((r) => (
                  <TaskItem key={r.task.id} row={r} onToggle={toggle} pending={pending} />
                ))}
              </div>
            </div>
          )}
          {dueToday.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Hoje</h3>
              <div className="space-y-1.5">
                {dueToday.map((r) => (
                  <TaskItem key={r.task.id} row={r} onToggle={toggle} pending={pending} />
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Próximas</h3>
              <div className="space-y-1.5">
                {upcoming.map((r) => (
                  <TaskItem key={r.task.id} row={r} onToggle={toggle} pending={pending} />
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Check className="size-3.5" />
                Concluídas recentemente
              </h3>
              <div className="space-y-1.5">
                {completed.map((r) => (
                  <TaskItem key={r.task.id} row={r} onToggle={toggle} pending={pending} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {data.decisions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Decisões pendentes</h3>
          <div className="space-y-1.5">
            {data.decisions.map((d) => (
              <div key={d.id} className="rounded-lg border border-border/60 bg-card/40 px-3.5 py-2.5 text-sm">
                {d.title}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>Só o título é obrigatório.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Editar 4 vídeos do ângulo luxo"
                autoFocus
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={form.responsibleId} onValueChange={(v) => setForm((f) => ({ ...f, responsibleId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguém" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Ninguém</SelectItem>
                    {data.users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Oferta</Label>
                <Select value={form.offerId} onValueChange={(v) => setForm((f) => ({ ...f, offerId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {data.offers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
