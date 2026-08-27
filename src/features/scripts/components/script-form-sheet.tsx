"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createScriptAction } from "@/app/actions/scripts";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { OfferOption, UserOption } from "@/features/scripts/types";
import { duration } from "@/lib/format";
import { countWords, estimateDurationSeconds } from "@/lib/metrics";
import { SCRIPT_STATUS_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { SCRIPT_STATUSES } from "@/types/domain";

const NONE = "__none__";
/** Preview local; o servidor recalcula com o WPM de settings/app. */
const PREVIEW_WPM = 150;

/**
 * Nova copy (§19). O conteudo digitado vira a V1 — a partir dai toda
 * alteracao gera V2, V3... na pagina da copy.
 */
export function ScriptFormSheet({
  open,
  onOpenChange,
  offers,
  users,
  formats = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offers: OfferOption[];
  users: UserOption[];
  formats?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const empty = {
    offerId: "",
    angleId: NONE,
    title: "",
    status: "rascunho",
    responsibleId: NONE,
    hook: "",
    body: "",
    cta: "",
    notes: "",
    suggestedFormat: NONE,
    editingInstructions: "",
    referenceLinks: "",
    deadline: "",
  };
  const [form, setForm] = useState(empty);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setErrors({});
    setShowMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedOffer = offers.find((o) => o.id === form.offerId);

  // Contagem ao vivo (§19): "317 palavras ≈ 2min07s"
  const words = useMemo(
    () => countWords([form.hook, form.body, form.cta].filter(Boolean).join(" ")),
    [form.hook, form.body, form.cta]
  );
  const seconds = estimateDurationSeconds(words, PREVIEW_WPM);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    startTransition(async () => {
      const result = await createScriptAction({
        offerId: form.offerId,
        angleId: form.angleId === NONE ? null : form.angleId,
        title: form.title.trim(), // vazio -> servidor deriva do hook
        status: form.status,
        responsibleId: form.responsibleId === NONE ? null : form.responsibleId,
        notes: form.notes,
        hook: form.hook,
        body: form.body,
        cta: form.cta,
        suggestedFormat:
          form.suggestedFormat === NONE ? null : form.suggestedFormat,
        editingInstructions: form.editingInstructions,
        referenceLinks: form.referenceLinks,
        deadline: form.deadline || null,
        sourceReferenceId: null,
      });

      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }

      const created = result.data as { code: string } | undefined;
      toast.success(`${created?.code ?? "Copy"} criada como V1`);
      onOpenChange(false);
      if (created) router.push(`/copies/${created.code}`);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>Nova Copy</SheetTitle>
          <SheetDescription>
            O conteúdo abaixo será salvo como V1. Código CP gerado ao salvar.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="thin-scroll flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Oferta" error={errors.offerId?.[0]} required>
                <Select
                  value={form.offerId || undefined}
                  onValueChange={(v) => {
                    set("offerId", v);
                    set("angleId", NONE);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha a oferta" />
                  </SelectTrigger>
                  <SelectContent>
                    {offers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.code} · {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Editor / Responsável">
                <Select
                  value={form.responsibleId}
                  onValueChange={(v) => set("responsibleId", v)}
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
              </Field>
            </div>

            <Field label="Hook" error={errors.body?.[0]}>
              <Textarea
                value={form.hook}
                onChange={(e) => set("hook", e.target.value)}
                placeholder="Você sabia que essa bolsa custa 300 reais nas lojas?"
                rows={2}
              />
            </Field>

            <Field label="Corpo">
              <Textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder="Desenvolvimento da copy..."
                rows={8}
              />
            </Field>

            <Field label="CTA">
              <Textarea
                value={form.cta}
                onChange={(e) => set("cta", e.target.value)}
                placeholder="Chama no WhatsApp e garante a sua."
                rows={2}
              />
            </Field>

            {/* Contagem ao vivo */}
            <div className="flex items-center gap-3 rounded-md border border-border/60 bg-accent/20 px-3 py-2 text-sm">
              <span className="tabular font-medium">{words} palavras</span>
              <span className="text-muted-foreground">≈ {duration(seconds)}</span>
              <span className="ml-auto text-xs text-muted-foreground/60">
                {PREVIEW_WPM} ppm
              </span>
            </div>

            {/* Briefing de producao (§4): opcional, nunca bloqueia */}
            <Collapsible open={showMore} onOpenChange={setShowMore}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    showMore && "rotate-180"
                  )}
                />
                Briefing e detalhes (formato, instruções, prazo...)
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Título (vazio deriva do hook)">
                    <Input
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="Copy principal — ângulo luxo"
                    />
                  </Field>
                  <Field label="Ângulo">
                    <Select
                      value={form.angleId}
                      onValueChange={(v) => set("angleId", v)}
                      disabled={!selectedOffer}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Nenhum</SelectItem>
                        {selectedOffer?.angles.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Formato sugerido">
                    <Select
                      value={form.suggestedFormat}
                      onValueChange={(v) => set("suggestedFormat", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Nenhum</SelectItem>
                        {formats.map((f) => (
                          <SelectItem key={f.slug} value={f.slug}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Prazo de produção">
                    <Input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => set("deadline", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Instruções de edição">
                  <Textarea
                    value={form.editingInstructions}
                    onChange={(e) => set("editingInstructions", e.target.value)}
                    placeholder="Legendas queimadas, cortes rápidos no hook, b-roll do produto aos 10s..."
                    rows={3}
                  />
                </Field>

                <Field label="Referências (um link por linha)">
                  <Textarea
                    value={form.referenceLinks}
                    onChange={(e) => set("referenceLinks", e.target.value)}
                    placeholder={"https://...\nhttps://..."}
                    rows={2}
                  />
                </Field>

                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCRIPT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SCRIPT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t border-border/60 px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !form.offerId}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Criar como V1
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
