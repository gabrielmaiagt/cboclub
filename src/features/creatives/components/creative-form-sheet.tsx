"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { ChevronDown, FileVideo, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  createCreativeAction,
  updateCreativeAction,
} from "@/app/actions/creatives";
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
import type {
  OfferOption,
  ScriptOption,
  UserOption,
} from "@/features/creatives/types";
import { firebaseStorage } from "@/lib/firebase/client";
import { CREATIVE_STATUS_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  CREATIVE_STATUSES,
  TRAFFIC_PLATFORMS,
  type Creative,
  type Taxonomy,
} from "@/types/domain";

interface CreativeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  creative?: Creative;
  offers: OfferOption[];
  scripts: ScriptOption[];
  users: UserOption[];
  taxonomy: Taxonomy;
}

const NONE = "__none__";

interface FormState {
  offerId: string;
  angleId: string;
  scriptId: string;
  scriptVersion: string;
  title: string;
  hook: string;
  format: string;
  platform: string;
  durationSeconds: string;
  editorId: string;
  responsibleId: string;
  status: string;
  sourceUrl: string;
  inspirationUrl: string;
  tags: string[];
  notes: string;
  storagePath: string;
}

function emptyState(): FormState {
  return {
    offerId: "",
    angleId: NONE,
    scriptId: NONE,
    scriptVersion: "",
    title: "",
    hook: "",
    format: NONE,
    platform: "meta",
    durationSeconds: "",
    editorId: NONE,
    responsibleId: NONE,
    status: "ideia",
    sourceUrl: "",
    inspirationUrl: "",
    tags: [],
    notes: "",
    storagePath: "",
  };
}

function fromCreative(creative: Creative): FormState {
  return {
    offerId: creative.offerId,
    angleId: creative.angleId ?? NONE,
    scriptId: creative.scriptId ?? NONE,
    scriptVersion:
      creative.scriptVersion != null ? String(creative.scriptVersion) : "",
    title: creative.title,
    hook: creative.hook ?? "",
    format: creative.format ?? NONE,
    platform: creative.platform,
    durationSeconds:
      creative.durationSeconds != null ? String(creative.durationSeconds) : "",
    editorId: creative.editorId ?? NONE,
    responsibleId: creative.responsibleId ?? NONE,
    status: creative.status,
    sourceUrl: creative.sourceUrl ?? "",
    inspirationUrl: creative.inspirationUrl ?? "",
    tags: creative.tags,
    notes: creative.notes ?? "",
    storagePath: creative.storagePath ?? "",
  };
}

export function CreativeFormSheet({
  open,
  onOpenChange,
  mode,
  creative,
  offers,
  scripts,
  users,
  taxonomy,
}: CreativeFormSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showMore, setShowMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(creative ? fromCreative(creative) : emptyState());
    setErrors({});
    setShowMore(mode === "edit");
  }, [open, creative, mode]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedOffer = offers.find((o) => o.id === form.offerId);
  const offerScripts = useMemo(
    () => scripts.filter((s) => s.offerId === form.offerId),
    [scripts, form.offerId]
  );
  const selectedScript = offerScripts.find((s) => s.id === form.scriptId);

  /** Opcoes de versao: 1..currentVersion da copy escolhida. */
  const versionOptions = useMemo(() => {
    if (!selectedScript) return [];
    return Array.from({ length: selectedScript.currentVersion }, (_, i) =>
      String(selectedScript.currentVersion - i)
    );
  }, [selectedScript]);

  function toggleTag(slug: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(slug)
        ? prev.tags.filter((t) => t !== slug)
        : [...prev.tags, slug],
    }));
  }

  async function handleFileUpload(file: File) {
    if (!form.offerId) {
      toast.error("Escolha a oferta antes de subir o arquivo.");
      return;
    }
    setUploading(true);
    try {
      const path = `creatives/${form.offerId}/${Date.now()}-${file.name}`;
      await uploadBytes(storageRef(firebaseStorage(), path), file);
      set("storagePath", path);
      toast.success("Arquivo enviado.");
    } catch {
      toast.error(
        "Upload falhou. Confira sua permissão ou use o campo de link."
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const durationRaw = form.durationSeconds.trim();
    if (durationRaw && Number.isNaN(Number(durationRaw))) {
      setErrors({ durationSeconds: ["Informe segundos, ex: 42."] });
      return;
    }

    const payload = {
      offerId: form.offerId,
      angleId: form.angleId === NONE ? null : form.angleId,
      scriptId: form.scriptId === NONE ? null : form.scriptId,
      scriptVersion:
        form.scriptId === NONE || !form.scriptVersion
          ? null
          : Number(form.scriptVersion),
      title: form.title.trim(),
      hook: form.hook,
      format: form.format === NONE ? null : form.format,
      platform: form.platform,
      durationSeconds: durationRaw ? Number(durationRaw) : null,
      editorId: form.editorId === NONE ? null : form.editorId,
      responsibleId: form.responsibleId === NONE ? null : form.responsibleId,
      status: form.status,
      storagePath: form.storagePath || null,
      thumbnailPath: creative?.thumbnailPath ?? null,
      sourceUrl: form.sourceUrl,
      inspirationUrl: form.inspirationUrl,
      tags: form.tags,
      notes: form.notes,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCreativeAction(payload)
          : await updateCreativeAction(creative!.id, payload);

      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }

      if (mode === "create" && "data" in result && result.data) {
        toast.success(`${(result.data as { code: string }).code} criado`);
      } else {
        toast.success("Criativo atualizado");
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function fieldError(name: string) {
    return errors[name]?.[0];
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>
            {mode === "create" ? "Novo Criativo" : `Editar ${creative?.code}`}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "O código CR é gerado automaticamente ao salvar."
              : "Alterações entram na timeline da oferta."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="thin-scroll flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <Field label="Oferta" error={fieldError("offerId")} required>
              <Select
                value={form.offerId || undefined}
                onValueChange={(v) => {
                  set("offerId", v);
                  // Angulo e copy pertencem a oferta: reset ao trocar
                  set("angleId", NONE);
                  set("scriptId", NONE);
                  set("scriptVersion", "");
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

            {/* Vinculo copy + versao especifica usada */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Copy">
                <Select
                  value={form.scriptId}
                  onValueChange={(v) => {
                    set("scriptId", v);
                    const script = offerScripts.find((s) => s.id === v);
                    set(
                      "scriptVersion",
                      script ? String(script.currentVersion) : ""
                    );
                  }}
                  disabled={!selectedOffer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {offerScripts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.code} · {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Versão">
                <Select
                  value={form.scriptVersion || undefined}
                  onValueChange={(v) => set("scriptVersion", v)}
                  disabled={!selectedScript}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        V{v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Editor">
                <Select
                  value={form.editorId}
                  onValueChange={(v) => set("editorId", v)}
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

              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CREATIVE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {CREATIVE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Detalhes secundarios: nada disto bloqueia o cadastro (§7) */}
            <Collapsible open={showMore} onOpenChange={setShowMore}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    showMore && "rotate-180"
                  )}
                />
                Mais detalhes (título, formato, tags, arquivo...)
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
            <Field label="Título" error={fieldError("title")}>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Vazio herda o título da copy"
              />
            </Field>

            <Field label="Hook">
              <Textarea
                value={form.hook}
                onChange={(e) => set("hook", e.target.value)}
                placeholder="Essa bolsa custa 300 na loja"
                rows={2}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
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

              <Field label="Formato">
                <Select
                  value={form.format}
                  onValueChange={(v) => set("format", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {taxonomy.creativeFormats.map((f) => (
                      <SelectItem key={f.slug} value={f.slug}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Plataforma">
                <Select
                  value={form.platform}
                  onValueChange={(v) => set("platform", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAFFIC_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Duração (s)" error={fieldError("durationSeconds")}>
                <Input
                  value={form.durationSeconds}
                  onChange={(e) => set("durationSeconds", e.target.value)}
                  placeholder="42"
                  inputMode="numeric"
                />
              </Field>

              <Field label="Responsável">
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

            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {taxonomy.tags.map((tag) => {
                  const active = form.tags.includes(tag.slug);
                  return (
                    <button
                      key={tag.slug}
                      type="button"
                      onClick={() => toggleTag(tag.slug)}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-xs transition-colors",
                        active
                          ? "border-foreground/40 bg-accent text-accent-foreground"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Arquivo no Storage + links externos */}
            <Field label="Arquivo do criativo">
              {form.storagePath ? (
                <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm">
                  <FileVideo className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {form.storagePath.split("/").pop()}
                  </span>
                  <button
                    type="button"
                    onClick={() => set("storagePath", "")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Remover arquivo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading || !form.offerId}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    {uploading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileVideo className="size-3.5" />
                    )}
                    {uploading ? "Enviando..." : "Subir arquivo"}
                  </Button>
                  <span className="text-xs text-muted-foreground/60">
                    ou use os links abaixo
                  </span>
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Link do arquivo (Drive, Dropbox...)">
                <Input
                  value={form.sourceUrl}
                  onChange={(e) => set("sourceUrl", e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
              </Field>
              <Field label="Link de inspiração">
                <Input
                  value={form.inspirationUrl}
                  onChange={(e) => set("inspirationUrl", e.target.value)}
                  placeholder="https://facebook.com/ads/library/..."
                />
              </Field>
            </div>

            <Field label="Observações">
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
              />
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
            <Button type="submit" disabled={pending || uploading || !form.offerId}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Criar criativo" : "Salvar"}
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
