"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { createToolAction, setToolActiveAction } from "@/app/actions/management";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
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
import { canWrite } from "@/lib/auth/permissions";
import { EMPTY, fullDate, money } from "@/lib/format";
import { TOOL_CATEGORIES, type AppRole, type Tool } from "@/types/domain";

export function FerramentasView({
  tools,
  role,
}: {
  tools: Tool[];
  users: { id: string; name: string }[];
  role: AppRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "outros", monthlyCost: "" });
  const editable = canWrite(role, "admin");

  const totalMonthly = tools.filter((t) => t.active).reduce((s, t) => s + t.monthlyCost, 0);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createToolAction({
        name: form.name.trim(),
        category: form.category,
        monthlyCost: Number(form.monthlyCost.replace(",", ".")) || 0,
        active: true,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Ferramenta cadastrada");
      setOpen(false);
      setForm({ name: "", category: "outros", monthlyCost: "" });
      router.refresh();
    });
  }

  function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      const result = await setToolActiveAction(id, active);
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível atualizar.");
        return;
      }
      router.refresh();
    });
  }

  const addButton = editable ? (
    <Button onClick={() => setOpen(true)} className="gap-2">
      <Plus className="size-4" />
      Nova Ferramenta
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ferramentas"
        description={`Custo mensal ativo: ${money(totalMonthly)}. Nunca guardamos senha aqui.`}
        action={addButton}
      />

      {tools.length === 0 ? (
        <EmptyState icon={<Wrench className="size-8" />} title="Nenhuma ferramenta cadastrada" action={addButton} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <tbody>
              {tools.map((t) => (
                <tr key={t.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3.5 py-2.5 font-medium">
                    {t.url ? (
                      <a href={t.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {t.name}
                      </a>
                    ) : (
                      t.name
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-muted-foreground">{t.category}</td>
                  <td className="px-3.5 py-2.5 text-muted-foreground">
                    {t.renewalDate ? fullDate(t.renewalDate) : EMPTY}
                  </td>
                  <td className="tabular px-3.5 py-2.5 text-right font-medium">{money(t.monthlyCost)}</td>
                  {editable && (
                    <td className="px-3.5 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => toggleActive(t.id, !t.active)}
                      >
                        {t.active ? "Desativar" : "Reativar"}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova ferramenta</DialogTitle>
            <DialogDescription>Nunca armazenamos senha aqui.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="CapCut Pro"
                autoFocus
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Custo mensal (R$)</Label>
                <Input
                  value={form.monthlyCost}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyCost: e.target.value }))}
                  placeholder="49,90"
                  inputMode="decimal"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
