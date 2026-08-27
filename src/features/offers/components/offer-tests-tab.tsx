"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlaskConical, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  concludeExperimentAction,
  createExperimentAction,
} from "@/app/actions/experiments";
import { EntityCode } from "@/components/shared/entity-code";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { EMPTY, money, multiplier } from "@/lib/format";
import {
  EXPERIMENT_RESULT_LABELS,
  EXPERIMENT_RESULT_TONE,
  EXPERIMENT_STATUS_LABELS,
  EXPERIMENT_STATUS_TONE,
  EXPERIMENT_VARIABLE_LABELS,
} from "@/lib/status";
import {
  EXPERIMENT_RESULTS,
  EXPERIMENT_VARIABLES,
  type Experiment,
} from "@/types/domain";

interface UserOption {
  id: string;
  name: string;
}

const NONE = "__none__";

/**
 * Aba Testes da oferta (§23-§25). "Em andamento" e "Histórico" separados;
 * concluir exige resultado + conclusão + próxima ação juntos (§24) —
 * o mesmo dialog que cria o registro ja bloqueia sem os três campos.
 */
export function OfferTestsTab({
  offerId,
  offerCode,
  experiments,
  users,
  editable,
}: {
  offerId: string;
  offerCode: string;
  experiments: Experiment[];
  users: UserOption[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newOpen, setNewOpen] = useState(false);
  const [concludeTarget, setConcludeTarget] = useState<Experiment | null>(null);

  const [form, setForm] = useState({
    name: "",
    hypothesis: "",
    variable: "angulo",
    responsibleId: NONE,
  });
  const [concludeForm, setConcludeForm] = useState({
    result: "vencedor",
    conclusion: "",
    nextAction: "",
  });

  const running = experiments.filter((e) => e.status === "rodando" || e.status === "planejado" || e.status === "pausado");
  const finished = experiments.filter((e) => e.status === "concluido" || e.status === "cancelado");
  const learnings = finished.filter((e) => e.conclusion);

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createExperimentAction(
        {
          offerId,
          name: form.name.trim(),
          hypothesis: form.hypothesis.trim(),
          variable: form.variable,
          status: "planejado",
          responsibleId: form.responsibleId === NONE ? null : form.responsibleId,
        },
        offerCode
      );
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível criar o teste.");
        return;
      }
      toast.success("Teste criado");
      setNewOpen(false);
      setForm({ name: "", hypothesis: "", variable: "angulo", responsibleId: NONE });
      router.refresh();
    });
  }

  function handleConclude(event: React.FormEvent) {
    event.preventDefault();
    if (!concludeTarget) return;
    startTransition(async () => {
      const result = await concludeExperimentAction(
        concludeTarget.id,
        concludeForm,
        offerCode
      );
      if (!result.ok) {
        toast.error(result.error ?? "Preencha resultado, conclusão e próxima ação.");
        return;
      }
      toast.success(`${concludeTarget.code} concluído`);
      setConcludeTarget(null);
      setConcludeForm({ result: "vencedor", conclusion: "", nextAction: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {editable && (
        <Button size="sm" onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Novo teste
        </Button>
      )}

      {/* Aprendizados recentes (§25) */}
      {learnings.length > 0 && (
        <div className="rounded-lg border border-status-win/30 bg-status-win/5 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-status-win">
            Aprendizados recentes
          </p>
          <ul className="space-y-2">
            {learnings.slice(0, 4).map((e) => (
              <li key={e.id} className="text-sm">
                <span className="text-muted-foreground">“</span>
                {e.conclusion}
                <span className="text-muted-foreground">”</span>
                <span className="ml-1.5 text-xs text-muted-foreground">— {e.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2.5 text-sm font-semibold">Em andamento</h3>
        {running.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum teste em andamento.
          </p>
        ) : (
          <div className="space-y-2">
            {running.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-border/60 bg-card/40 p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <EntityCode code={e.code} />
                      <StatusBadge
                        label={EXPERIMENT_STATUS_LABELS[e.status]}
                        tone={EXPERIMENT_STATUS_TONE[e.status]}
                        dot={false}
                      />
                      <span className="text-xs text-muted-foreground">
                        {EXPERIMENT_VARIABLE_LABELS[e.variable]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{e.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{e.hypothesis}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right text-sm">
                    <div>
                      <p className="tabular">{money(e.spend)}</p>
                      <p className="text-xs text-muted-foreground">gasto</p>
                    </div>
                    <div>
                      <p className="tabular">{money(e.revenue)}</p>
                      <p className="text-xs text-muted-foreground">receita</p>
                    </div>
                  </div>
                </div>
                {editable && e.status === "rodando" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setConcludeTarget(e)}
                  >
                    Concluir teste
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2.5 text-sm font-semibold">Histórico</h3>
        {finished.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum teste concluído ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <tbody>
                {finished.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3.5 py-3">
                      <EntityCode code={e.code} className="mb-0.5 block" />
                      <span className="font-medium">{e.name}</span>
                      {e.conclusion && (
                        <p className="mt-1 text-xs text-muted-foreground">{e.conclusion}</p>
                      )}
                      {e.nextAction && (
                        <p className="mt-0.5 text-xs text-status-live">
                          Próxima ação: {e.nextAction}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-right">
                      {e.result ? (
                        <StatusBadge
                          label={EXPERIMENT_RESULT_LABELS[e.result]}
                          tone={EXPERIMENT_RESULT_TONE[e.result]}
                          dot={false}
                        />
                      ) : (
                        EMPTY
                      )}
                    </td>
                    <td className="tabular whitespace-nowrap px-3.5 py-3 text-right text-muted-foreground">
                      {multiplier(e.spend ? e.revenue / e.spend : null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Novo teste */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo teste</DialogTitle>
            <DialogDescription>
              Nome, hipótese e variável. Números e conclusão entram depois.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do teste</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ângulo luxo vs renda extra"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hipótese</Label>
              <Textarea
                value={form.hypothesis}
                onChange={(e) => setForm((f) => ({ ...f, hypothesis: e.target.value }))}
                placeholder="O que você acha que vai acontecer e por quê"
                rows={2}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Variável testada</Label>
                <Select
                  value={form.variable}
                  onValueChange={(v) => setForm((f) => ({ ...f, variable: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIMENT_VARIABLES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {EXPERIMENT_VARIABLE_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select
                  value={form.responsibleId}
                  onValueChange={(v) => setForm((f) => ({ ...f, responsibleId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguém" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Ninguém</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNewOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Criar teste
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Concluir teste — result+conclusion+nextAction juntos (§24) */}
      <Dialog open={!!concludeTarget} onOpenChange={(o) => !o && setConcludeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="size-4" />
              Concluir {concludeTarget?.code}
            </DialogTitle>
            <DialogDescription>
              Resultado, conclusão e próxima ação são obrigatórios — é o que vira
              memória operacional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConclude} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Resultado</Label>
              <Select
                value={concludeForm.result}
                onValueChange={(v) => setConcludeForm((f) => ({ ...f, result: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIMENT_RESULTS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {EXPERIMENT_RESULT_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>O que aprendemos?</Label>
              <Textarea
                value={concludeForm.conclusion}
                onChange={(e) =>
                  setConcludeForm((f) => ({ ...f, conclusion: e.target.value }))
                }
                placeholder="Ângulo luxo performou 2,2x melhor que renda extra"
                rows={2}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>O que faremos com isso?</Label>
              <Textarea
                value={concludeForm.nextAction}
                onChange={(e) =>
                  setConcludeForm((f) => ({ ...f, nextAction: e.target.value }))
                }
                placeholder="Criar 5 criativos novos no ângulo luxo"
                rows={2}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConcludeTarget(null)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Concluir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

