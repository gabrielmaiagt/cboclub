"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown, GitBranchPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  addScriptVersionAction,
  updateScriptMetaAction,
} from "@/app/actions/scripts";
import { EntityCode } from "@/components/shared/entity-code";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserOption } from "@/features/scripts/types";
import { canWrite } from "@/lib/auth/permissions";
import { dateTime, duration, EMPTY } from "@/lib/format";
import { countWords, estimateDurationSeconds } from "@/lib/metrics";
import {
  SCRIPT_STATUS_LABELS,
  SCRIPT_STATUS_TONE,
  TONE_DOT,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  SCRIPT_STATUSES,
  type ActivityEntry,
  type AppRole,
  type Offer,
  type Script,
  type ScriptStatus,
  type ScriptVersionData,
} from "@/types/domain";

interface ScriptDetailProps {
  script: Script;
  versions: ScriptVersionData[];
  offer: Offer | null;
  activity: ActivityEntry[];
  role: AppRole;
  wordsPerMinute: number;
  users: UserOption[];
}

/**
 * Pagina da copy (§20).
 *
 * Versoes antigas sao SOMENTE leitura — o botao "Nova versao" abre o
 * editor pre-preenchido com a versao selecionada e salva como V(n+1).
 * Nao existe caminho na UI (nem nas rules) para sobrescrever conteudo.
 */
export function ScriptDetail({
  script,
  versions,
  offer,
  activity,
  role,
  wordsPerMinute,
  users,
}: ScriptDetailProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editable = canWrite(role, "creative");

  const [selectedVersion, setSelectedVersion] = useState(script.currentVersion);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ hook: "", body: "", cta: "", changeNote: "" });

  const angle = offer?.angles.find((a) => a.id === script.angleId);
  const responsibleName = users.find((u) => u.id === script.responsibleId)?.name;

  const viewed =
    versions.find((v) => v.version === selectedVersion) ?? versions[0] ?? null;

  const draftWords = useMemo(
    () =>
      countWords([draft.hook, draft.body, draft.cta].filter(Boolean).join(" ")),
    [draft]
  );

  function startNewVersion() {
    // Pre-preenche com a versao em exibicao: iterar sobre o que existe
    setDraft({
      hook: viewed?.hook ?? "",
      body: viewed?.body ?? "",
      cta: viewed?.cta ?? "",
      changeNote: "",
    });
    setEditing(true);
  }

  function saveNewVersion() {
    startTransition(async () => {
      const result = await addScriptVersionAction({
        scriptId: script.id,
        hook: draft.hook,
        body: draft.body,
        cta: draft.cta,
        changeNote: draft.changeNote,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar a versão.");
        return;
      }

      const version = (result.data as { version: number } | undefined)?.version;
      toast.success(`V${version ?? "?"} salva`);
      setEditing(false);
      setSelectedVersion(version ?? script.currentVersion + 1);
      router.refresh();
    });
  }

  function handleStatusChange(status: ScriptStatus) {
    if (status === script.status) return;
    startTransition(async () => {
      const result = await updateScriptMetaAction(script.id, { status });
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível mudar o status.");
        return;
      }
      toast.success(`${script.code} → ${SCRIPT_STATUS_LABELS[status]}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {script.title}
            </h1>

            {editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={pending}
                  className="flex items-center gap-1 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
                  aria-label="Mudar status"
                >
                  <StatusBadge
                    label={SCRIPT_STATUS_LABELS[script.status]}
                    tone={SCRIPT_STATUS_TONE[script.status]}
                  />
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {SCRIPT_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onSelect={() => handleStatusChange(status)}
                      className={cn(status === script.status && "bg-accent/50")}
                    >
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          TONE_DOT[SCRIPT_STATUS_TONE[status]]
                        )}
                      />
                      {SCRIPT_STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <StatusBadge
                label={SCRIPT_STATUS_LABELS[script.status]}
                tone={SCRIPT_STATUS_TONE[script.status]}
              />
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <EntityCode code={script.code} className="text-xs" />
            {offer && (
              <Link
                href={`/ofertas/${offer.code}`}
                className="hover:text-foreground hover:underline"
              >
                {offer.code} · {offer.name}
              </Link>
            )}
            {angle && <span>Ângulo: {angle.name}</span>}
            {responsibleName && <span>{responsibleName}</span>}
          </div>
        </div>

        {editable && !editing && (
          <Button size="sm" onClick={startNewVersion} className="gap-1.5">
            <GitBranchPlus className="size-3.5" />
            Nova versão
          </Button>
        )}
      </div>

      {/* ── Briefing de producao (§4): o que o editor precisa saber ── */}
      {(script.editingInstructions ||
        script.suggestedFormat ||
        script.deadline ||
        script.referenceLinks) && (
        <div className="rounded-lg border border-status-warn/30 bg-status-warn/5 p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-status-warn">
            Briefing de produção
          </p>
          <div className="space-y-1.5 text-sm">
            {script.suggestedFormat && (
              <p>
                <span className="text-muted-foreground">Formato sugerido:</span>{" "}
                {script.suggestedFormat}
              </p>
            )}
            {script.deadline && (
              <p>
                <span className="text-muted-foreground">Prazo:</span>{" "}
                {script.deadline.split("-").reverse().join("/")}
              </p>
            )}
            {script.editingInstructions && (
              <p className="whitespace-pre-wrap">{script.editingInstructions}</p>
            )}
            {script.referenceLinks && (
              <div className="space-y-0.5">
                {script.referenceLinks.split("\n").filter(Boolean).map((link) => (
                  <a
                    key={link}
                    href={link.trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-muted-foreground underline decoration-border hover:text-foreground"
                  >
                    {link.trim()}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* ── Seletor de versoes ──────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5">
            {versions.map((v) => (
              <button
                key={v.version}
                onClick={() => {
                  setSelectedVersion(v.version);
                  setEditing(false);
                }}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedVersion === v.version && !editing
                    ? "border-foreground/40 bg-accent text-accent-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                V{v.version}
                {v.version === script.currentVersion && (
                  <span className="ml-1 text-[10px] text-muted-foreground/60">
                    atual
                  </span>
                )}
              </button>
            ))}
            {editing && (
              <span className="rounded-md border border-dashed border-foreground/40 bg-accent px-2.5 py-1 text-xs font-medium">
                V{script.currentVersion + 1} · rascunho
              </span>
            )}
          </div>

          {/* ── Conteudo ────────────────────────────────────────── */}
          {editing ? (
            <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
              <div className="space-y-1.5">
                <Label>Hook</Label>
                <Textarea
                  value={draft.hook}
                  onChange={(e) => setDraft((d) => ({ ...d, hook: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Corpo</Label>
                <Textarea
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CTA</Label>
                <Textarea
                  value={draft.cta}
                  onChange={(e) => setDraft((d) => ({ ...d, cta: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>O que mudou nesta versão?</Label>
                <Input
                  value={draft.changeNote}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, changeNote: e.target.value }))
                  }
                  placeholder="Hook mais direto, ancoragem de preço na primeira linha"
                />
              </div>

              <div className="flex items-center gap-3 rounded-md bg-accent/20 px-3 py-2 text-sm">
                <span className="tabular font-medium">{draftWords} palavras</span>
                <span className="text-muted-foreground">
                  ≈ {duration(estimateDurationSeconds(draftWords, wordsPerMinute))}
                </span>
                <span className="ml-auto text-xs text-muted-foreground/60">
                  {wordsPerMinute} ppm
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={pending}
                >
                  Descartar
                </Button>
                <Button onClick={saveNewVersion} disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Salvar como V{script.currentVersion + 1}
                </Button>
              </div>
            </div>
          ) : viewed ? (
            <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
              <ContentBlock label="Hook" text={viewed.hook} />
              <ContentBlock label="Corpo" text={viewed.body} />
              <ContentBlock label="CTA" text={viewed.cta} />

              <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                <span className="tabular font-medium text-foreground">
                  {viewed.wordCount} palavras
                </span>
                <span>≈ {duration(viewed.estimatedDurationSeconds)}</span>
                {viewed.changeNote && <span>· {viewed.changeNote}</span>}
                <span className="ml-auto">{dateTime(viewed.createdAt)}</span>
              </div>

              {selectedVersion !== script.currentVersion && (
                <p className="rounded-md border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
                  Versão antiga — somente leitura. Use “Nova versão” para
                  iterar a partir dela.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem conteúdo.</p>
          )}
        </div>

        {/* ── Timeline ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="mb-3 text-sm font-medium">Histórico</p>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">Nenhum evento.</p>
          ) : (
            <ol className="relative space-y-0 border-l border-border/60 pl-4">
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
    </div>
  );
}

function ContentBlock({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      {text ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground/50">{EMPTY}</p>
      )}
    </div>
  );
}
