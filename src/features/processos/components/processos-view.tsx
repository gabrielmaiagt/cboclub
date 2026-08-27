"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createProcessAction, updateProcessAction } from "@/app/actions/management";
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
import { Textarea } from "@/components/ui/textarea";
import { canWrite } from "@/lib/auth/permissions";
import { SOP_CATEGORIES, type AppRole, type ProcessDoc } from "@/types/domain";

export function ProcessosView({
  processes,
  role,
}: {
  processes: ProcessDoc[];
  role: AppRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessDoc | null>(null);
  const [form, setForm] = useState({ title: "", category: "geral", content: "" });
  const editable = canWrite(role, "admin");

  function openNew() {
    setForm({ title: "", category: "geral", content: "" });
    setNewOpen(true);
  }

  function openEdit(p: ProcessDoc) {
    setForm({ title: p.title, category: p.category, content: p.content });
    setEditing(p);
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createProcessAction({
        title: form.title.trim(),
        category: form.category,
        content: form.content,
        active: true,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Processo criado");
      setNewOpen(false);
      router.refresh();
    });
  }

  function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    startTransition(async () => {
      const result = await updateProcessAction(editing.id, {
        title: form.title.trim(),
        category: form.category,
        content: form.content,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Processo atualizado");
      setEditing(null);
      router.refresh();
    });
  }

  const addButton = editable ? (
    <Button onClick={openNew} className="gap-2">
      <Plus className="size-4" />
      Novo Processo
    </Button>
  ) : null;

  const dialogOpen = newOpen || !!editing;
  const isEditing = !!editing;

  return (
    <div className="space-y-5">
      <PageHeader title="Processos" description="Como a operação funciona, documentado." action={addButton} />

      {processes.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-8" />} title="Nenhum processo documentado" action={addButton} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {processes.map((p) => (
            <button
              key={p.id}
              onClick={() => (editable ? openEdit(p) : undefined)}
              className="rounded-lg border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-border"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{p.title}</p>
                <span className="text-xs text-muted-foreground">{p.category}</span>
              </div>
              <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                {p.content}
              </p>
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setNewOpen(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? `Editar ${editing?.title}` : "Novo processo"}</DialogTitle>
            <DialogDescription>Não precisa ser sofisticado — só claro.</DialogDescription>
          </DialogHeader>
          <form onSubmit={isEditing ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Como subir uma oferta"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOP_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={8}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setNewOpen(false);
                  setEditing(null);
                }}
                disabled={pending}
              >
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
