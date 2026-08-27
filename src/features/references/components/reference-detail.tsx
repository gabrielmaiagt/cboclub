"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ExternalLink, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import {
  changeReferenceStatusAction,
  createModelagemAction,
  updateReferenceAction,
} from "@/app/actions/references";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VideoUploadField } from "@/components/shared/storage-video";
import type { MiningOption } from "@/features/references/types";
import { canWrite } from "@/lib/auth/permissions";
import { dateTime, EMPTY } from "@/lib/format";
import {
  REFERENCE_STATUS_LABELS,
  REFERENCE_STATUS_TONE,
  TONE_DOT,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  REFERENCE_STATUSES,
  type ActivityEntry,
  type AppRole,
  type CreativeReference,
  type ReferenceStatus,
} from "@/types/domain";

interface ModelagemSummary {
  id: string;
  code: string;
  title: string;
  status: string;
  currentVersion: number;
}

interface OfferOption {
  id: string;
  code: string;
  name: string;
}

interface ReferenceDetailProps {
  reference: CreativeReference;
  modelagens: ModelagemSummary[];
  miningItem: MiningOption | null;
  miningItems: MiningOption[];
  offers: OfferOption[];
  activity: ActivityEntry[];
  role: AppRole;
}

export function ReferenceDetail({
  reference,
  modelagens,
  miningItem,
  offers,
  activity,
  role,
}: ReferenceDetailProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editable = canWrite(role, "creative");

  const [modelagemOpen, setModelagemOpen] = useState(false);
  const [modelagemOffer, setModelagemOffer] = useState("");

  // Edicao inline dos textos (§11): transcricao, por que salvei, analise
  const [editingField, setEditingField] = useState<
    "transcription" | "whySaved" | "analysis" | null
  >(null);
  const [fieldDraft, setFieldDraft] = useState("");

  function handleStatusChange(status: ReferenceStatus) {
    if (status === reference.status) return;
    startTransition(async () => {
      const result = await changeReferenceStatusAction({
        id: reference.id,
        status,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mudar o status.");
        return;
      }
      toast.success(`${reference.code} → ${REFERENCE_STATUS_LABELS[status]}`);
      router.refresh();
    });
  }

  function handleVideoChange(storagePath: string | null) {
    startTransition(async () => {
      const result = await updateReferenceAction(reference.id, { storagePath });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar o vídeo.");
        return;
      }
      router.refresh();
    });
  }

  function saveField() {
    if (!editingField) return;
    const field = editingField;
    startTransition(async () => {
      const result = await updateReferenceAction(reference.id, {
        [field]: fieldDraft,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Salvo");
      setEditingField(null);
      router.refresh();
    });
  }

  function handleModelagem() {
    startTransition(async () => {
      const result = await createModelagemAction({
        referenceId: reference.id,
        offerId: modelagemOffer,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível criar a modelagem.");
        return;
      }
      const scriptCode = (result.data as { scriptCode: string }).scriptCode;
      toast.success(`Copy ${scriptCode} criada a partir de ${reference.code}`);
      setModelagemOpen(false);
      router.push(`/copies/${scriptCode}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">
              {reference.code}
            </h1>
            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={pending}
                  className="flex items-center gap-1 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  <StatusBadge
                    label={REFERENCE_STATUS_LABELS[reference.status]}
                    tone={REFERENCE_STATUS_TONE[reference.status]}
                  />
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {REFERENCE_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onSelect={() => handleStatusChange(status)}
                      className={cn(status === reference.status && "bg-accent/50")}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          TONE_DOT[REFERENCE_STATUS_TONE[status]]
                        )}
                      />
                      {REFERENCE_STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <StatusBadge
                label={REFERENCE_STATUS_LABELS[reference.status]}
                tone={REFERENCE_STATUS_TONE[reference.status]}
              />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Referência externa</span>
            {miningItem && (
              <span className="flex items-center gap-1">
                ↳ oferta minerada:{" "}
                <EntityCode code={miningItem.code} className="text-xs" />{" "}
                {miningItem.name}
              </span>
            )}
          </div>
        </div>

        {editable && (
          <Button
            size="sm"
            onClick={() => setModelagemOpen(true)}
            className="gap-1.5"
          >
            <Wand2 className="size-3.5" />
            Criar modelagem
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* ── Material original (§11) ──────────────────────────── */}
          <Section title="Material original">
            <div className="space-y-3">
              {reference.url ? (
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                  <span className="truncate underline decoration-border">
                    {reference.url}
                  </span>
                </a>
              ) : !reference.storagePath ? (
                <p className="text-sm text-muted-foreground/50">{EMPTY}</p>
              ) : null}

              {editable ? (
                <VideoUploadField
                  path={reference.storagePath}
                  pathPrefix="references"
                  onChange={handleVideoChange}
                  disabled={pending}
                  label="Anexar vídeo"
                />
              ) : (
                reference.storagePath && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {reference.storagePath}
                  </p>
                )
              )}
            </div>
          </Section>

          {/* ── Transcricao original — NUNCA sobrescrita (§11) ───── */}
          <EditableSection
            title="Transcrição original"
            hint="Cole aqui exatamente como veio da ferramenta externa. A modelagem cria uma copy nova — este texto permanece intocado."
            value={reference.transcription}
            editing={editingField === "transcription"}
            editable={editable}
            pending={pending}
            draft={fieldDraft}
            onDraft={setFieldDraft}
            onStart={() => {
              setEditingField("transcription");
              setFieldDraft(reference.transcription ?? "");
            }}
            onCancel={() => setEditingField(null)}
            onSave={saveField}
            rows={8}
          />

          <EditableSection
            title="Por que salvei"
            value={reference.whySaved}
            editing={editingField === "whySaved"}
            editable={editable}
            pending={pending}
            draft={fieldDraft}
            onDraft={setFieldDraft}
            onStart={() => {
              setEditingField("whySaved");
              setFieldDraft(reference.whySaved ?? "");
            }}
            onCancel={() => setEditingField(null)}
            onSave={saveField}
            rows={2}
          />

          <EditableSection
            title="Análise"
            hint="Aprofundamento opcional: por que funciona, estrutura, gatilhos."
            value={reference.analysis}
            editing={editingField === "analysis"}
            editable={editable}
            pending={pending}
            draft={fieldDraft}
            onDraft={setFieldDraft}
            onStart={() => {
              setEditingField("analysis");
              setFieldDraft(reference.analysis ?? "");
            }}
            onCancel={() => setEditingField(null)}
            onSave={saveField}
            rows={5}
          />

          {/* ── Nossa modelagem (§11, §12) ───────────────────────── */}
          <Section title="Nossa modelagem">
            {modelagens.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">
                Nenhuma copy interna criada a partir desta referência ainda.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {modelagens.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/copies/${m.code}`}
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <EntityCode code={m.code} className="text-xs" />
                      <span>{m.title}</span>
                      <span className="rounded bg-accent/60 px-1.5 py-0.5 text-[11px]">
                        V{m.currentVersion}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* ── Timeline ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-3 text-sm font-medium">Histórico</p>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">Nenhum evento.</p>
          ) : (
            <ol className="relative border-l border-border/60 pl-4">
              {activity.map((entry) => (
                <li key={entry.id} className="relative pb-3 last:pb-0">
                  <span className="absolute -left-[19px] top-1.5 size-1.5 rounded-full bg-border" />
                  <p className="text-xs">{entry.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {dateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ── Dialog: escolher a oferta interna da modelagem ───────── */}
      <Dialog open={modelagemOpen} onOpenChange={setModelagemOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar modelagem</DialogTitle>
            <DialogDescription>
              Gera uma copy interna rascunho a partir desta referência, com a
              transcrição como ponto de partida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Para qual oferta?</Label>
            <Select value={modelagemOffer || undefined} onValueChange={setModelagemOffer}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha a oferta interna" />
              </SelectTrigger>
              <SelectContent>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.code} · {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModelagemOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleModelagem} disabled={pending || !modelagemOffer}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Criar copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {title}
      </p>
      {children}
    </div>
  );
}

function EditableSection({
  title,
  hint,
  value,
  editing,
  editable,
  pending,
  draft,
  onDraft,
  onStart,
  onCancel,
  onSave,
  rows,
}: {
  title: string;
  hint?: string;
  value: string | null;
  editing: boolean;
  editable: boolean;
  pending: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  rows: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {title}
        </p>
        {editable && !editing && (
          <button
            onClick={onStart}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {value ? "Editar" : "Adicionar"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            rows={rows}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onSave} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      ) : value ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground/50">
          {hint ?? EMPTY}
        </p>
      )}
    </div>
  );
}
