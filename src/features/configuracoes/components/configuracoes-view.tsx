"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  addCreativeFormatAction,
  addLibraryAngleAction,
  addTagAction,
  updateAppSettingsAction,
} from "@/app/actions/settings";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canWrite } from "@/lib/auth/permissions";
import type { AppRole, AppSettings, Taxonomy } from "@/types/domain";

export function ConfiguracoesView({
  settings,
  taxonomy,
  role,
}: {
  settings: AppSettings;
  taxonomy: Taxonomy;
  role: AppRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editable = canWrite(role, "admin");

  const [form, setForm] = useState({
    currency: settings.currency,
    defaultCountry: settings.defaultCountry,
    copyWordsPerMinute: String(settings.copyWordsPerMinute),
    chipsTarget: String(settings.chipsTarget),
  });
  const [newFormat, setNewFormat] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newAngle, setNewAngle] = useState("");

  function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateAppSettingsAction({
        currency: form.currency,
        defaultCountry: form.defaultCountry,
        copyWordsPerMinute: Number(form.copyWordsPerMinute) || 150,
        chipsTarget: Number(form.chipsTarget) || 50,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Configurações salvas");
      router.refresh();
    });
  }

  function addFormat() {
    if (!newFormat.trim()) return;
    startTransition(async () => {
      const result = await addCreativeFormatAction(newFormat);
      if (!result.ok) {
        toast.error(result.error ?? "Erro");
        return;
      }
      setNewFormat("");
      router.refresh();
    });
  }

  function addTag() {
    if (!newTag.trim()) return;
    startTransition(async () => {
      const result = await addTagAction(newTag);
      if (!result.ok) {
        toast.error(result.error ?? "Erro");
        return;
      }
      setNewTag("");
      router.refresh();
    });
  }

  function addAngle() {
    if (!newAngle.trim()) return;
    startTransition(async () => {
      const result = await addLibraryAngleAction(newAngle, "");
      if (!result.ok) {
        toast.error(result.error ?? "Erro");
        return;
      }
      setNewAngle("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="O básico que a operação inteira usa." />

      <form onSubmit={saveSettings} className="grid gap-4 rounded-lg border border-border/60 bg-card/40 p-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Moeda</Label>
          <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} disabled={!editable} />
        </div>
        <div className="space-y-1.5">
          <Label>País padrão</Label>
          <Input value={form.defaultCountry} onChange={(e) => setForm((f) => ({ ...f, defaultCountry: e.target.value }))} disabled={!editable} />
        </div>
        <div className="space-y-1.5">
          <Label>Palavras/minuto</Label>
          <Input
            value={form.copyWordsPerMinute}
            onChange={(e) => setForm((f) => ({ ...f, copyWordsPerMinute: e.target.value }))}
            disabled={!editable}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Meta de chips</Label>
          <Input
            value={form.chipsTarget}
            onChange={(e) => setForm((f) => ({ ...f, chipsTarget: e.target.value }))}
            disabled={!editable}
            inputMode="numeric"
          />
        </div>
        {editable && (
          <div className="sm:col-span-4">
            <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        )}
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-2 text-sm font-medium">Formatos de criativo</p>
          <div className="flex flex-wrap gap-1.5">
            {taxonomy.creativeFormats.map((f) => (
              <span key={f.slug} className="rounded-md border border-border/60 px-2 py-0.5 text-xs">
                {f.name}
              </span>
            ))}
          </div>
          {editable && (
            <div className="mt-3 flex gap-1.5">
              <Input value={newFormat} onChange={(e) => setNewFormat(e.target.value)} placeholder="Novo formato" className="h-8" />
              <Button size="icon-sm" variant="outline" onClick={addFormat} disabled={pending}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-2 text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {taxonomy.tags.map((t) => (
              <span key={t.slug} className="rounded-md border border-border/60 px-2 py-0.5 text-xs">
                {t.name}
              </span>
            ))}
          </div>
          {editable && (
            <div className="mt-3 flex gap-1.5">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Nova tag" className="h-8" />
              <Button size="icon-sm" variant="outline" onClick={addTag} disabled={pending}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-2 text-sm font-medium">Biblioteca de ângulos</p>
          <div className="flex flex-wrap gap-1.5">
            {taxonomy.angleLibrary.map((a) => (
              <span key={a.slug} className="rounded-md border border-border/60 px-2 py-0.5 text-xs">
                {a.name}
              </span>
            ))}
          </div>
          {editable && (
            <div className="mt-3 flex gap-1.5">
              <Input value={newAngle} onChange={(e) => setNewAngle(e.target.value)} placeholder="Novo ângulo" className="h-8" />
              <Button size="icon-sm" variant="outline" onClick={addAngle} disabled={pending}>
                <Plus className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
