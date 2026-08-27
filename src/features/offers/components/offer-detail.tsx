"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { setOfferHealthAction } from "@/app/actions/offers";
import { EntityCode } from "@/components/shared/entity-code";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfferFormSheet } from "@/features/offers/components/offer-form-sheet";
import { OfferCharts } from "@/features/offers/components/offer-charts";
import { OfferStatusMenu } from "@/features/offers/components/offer-status-menu";
import type { UserOption } from "@/features/offers/types";
import { canWrite } from "@/lib/auth/permissions";
import {
  dateTime,
  duration as formatDuration,
  EMPTY,
  money,
  multiplier,
  percent,
  integer,
} from "@/lib/format";
import type { DerivedMetrics } from "@/lib/metrics";
import {
  OFFER_HEALTH_LABELS,
  OFFER_HEALTH_TONE,
  TONE_DOT,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  OFFER_HEALTHS,
  type ActivityEntry,
  type AppRole,
  type Offer,
} from "@/types/domain";

interface SeriesPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number | null;
}

/** Copy enxuta para a aba Copy. */
interface ScriptSummary {
  id: string;
  code: string;
  title: string;
  status: string;
  currentVersion: number;
  wordCount: number;
  estimatedDurationSeconds: number;
}

/** Criativo enxuto para a aba Criativos. */
interface CreativeSummary {
  id: string;
  code: string;
  title: string;
  status: string;
  format: string | null;
  scriptVersion: number | null;
}

interface OfferDetailProps {
  offer: Offer;
  lifetime: DerivedMetrics;
  today: DerivedMetrics;
  series: SeriesPoint[];
  activity: ActivityEntry[];
  role: AppRole;
  users: UserOption[];
  scripts: ScriptSummary[];
  creatives: CreativeSummary[];
}

/** Card de metrica dos §49. */
function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "win" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-0.5 text-base font-semibold",
          accent === "win" && "text-status-win",
          accent === "danger" && "text-status-danger"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function OfferDetail({
  offer,
  lifetime,
  today,
  series,
  activity,
  role,
  users,
  scripts,
  creatives,
}: OfferDetailProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const editable = canWrite(role, "offers");

  async function handleHealthChange(health: (typeof OFFER_HEALTHS)[number]) {
    const result = await setOfferHealthAction({ id: offer.id, health });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível alterar a saúde.");
      return;
    }
    router.refresh();
  }

  const profitAccent =
    lifetime.operationalProfit > 0
      ? "win"
      : lifetime.operationalProfit < 0
        ? "danger"
        : undefined;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {offer.name}
            </h1>
            <OfferStatusMenu offer={offer} editable={editable} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <EntityCode code={offer.code} className="text-xs" />
            {offer.niche && <span>{offer.niche}</span>}
            {offer.ticketPrice != null && (
              <span className="tabular">{money(offer.ticketPrice)}</span>
            )}

            {/* Saúde manual (§50) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={!editable}
                className="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs transition-colors hover:bg-accent/50 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    TONE_DOT[OFFER_HEALTH_TONE[offer.health]]
                  )}
                />
                {OFFER_HEALTH_LABELS[offer.health]}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {OFFER_HEALTHS.map((h) => (
                  <DropdownMenuItem key={h} onSelect={() => handleHealthChange(h)}>
                    <span
                      className={cn("size-2 rounded-full", TONE_DOT[OFFER_HEALTH_TONE[h]])}
                    />
                    {OFFER_HEALTH_LABELS[h]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {editable && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
        )}
      </div>

      {/* ── Cards acumulados (§49) ──────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        <Stat label="Investimento" value={money(lifetime.spend)} />
        <Stat label="Receita" value={money(lifetime.revenue)} />
        <Stat
          label="Lucro"
          value={money(lifetime.operationalProfit)}
          accent={profitAccent}
        />
        <Stat label="ROAS" value={multiplier(lifetime.roas)} />
        <Stat label="ROI" value={percent(lifetime.roi)} />
        <Stat label="Vendas" value={integer(lifetime.sales)} />
        <Stat label="CPA" value={money(lifetime.cpa)} />
        <Stat label="Leads" value={integer(lifetime.leads)} />
        <Stat label="CPL" value={money(lifetime.cpl)} />
      </div>

      {/* ── Abas (§12) ──────────────────────────────────────────── */}
      <Tabs defaultValue="resumo">
        <TabsList className="thin-scroll w-full justify-start overflow-x-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="angulos">
            Ângulos {offer.angles.length > 0 && `(${offer.angles.length})`}
          </TabsTrigger>
          <TabsTrigger value="paginas">
            Páginas {offer.pages.length > 0 && `(${offer.pages.length})`}
          </TabsTrigger>
          <TabsTrigger value="trafego">
            Tráfego {offer.campaigns.length > 0 && `(${offer.campaigns.length})`}
          </TabsTrigger>
          <TabsTrigger value="copy">
            Copy {scripts.length > 0 && `(${scripts.length})`}
          </TabsTrigger>
          <TabsTrigger value="criativos">
            Criativos {creatives.length > 0 && `(${creatives.length})`}
          </TabsTrigger>
          <TabsTrigger value="testes" disabled>Testes</TabsTrigger>
          <TabsTrigger value="chips" disabled>Chips</TabsTrigger>
          <TabsTrigger value="financeiro" disabled>Financeiro</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4 space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4 lg:col-span-1">
              <Info label="Promessa" value={offer.mainPromise} />
              <Info label="Mecanismo" value={offer.mechanism} />
              <Info label="Público" value={offer.targetAudience} />
              <Info label="Próxima ação" value={offer.nextAction} />
              {offer.notes && <Info label="Observações" value={offer.notes} />}
              <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                <span>Hoje: {money(today.spend)} gasto</span>
                <span className="tabular">{multiplier(today.roas)} ROAS</span>
              </div>
            </div>

            <div className="lg:col-span-2">
              <OfferCharts series={series} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="copy" className="mt-4">
          {scripts.length === 0 ? (
            <TabEmpty text="Nenhuma copy para esta oferta. Crie em Copies → Nova Copy." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <tbody>
                  {scripts.map((s) => (
                    <tr key={s.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3.5 py-2.5">
                        <Link href={`/copies/${s.code}`} className="hover:underline">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {s.code}
                          </span>{" "}
                          <span className="font-medium">{s.title}</span>
                        </Link>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="rounded bg-accent/60 px-1.5 py-0.5 text-xs font-medium">
                          V{s.currentVersion}
                        </span>
                      </td>
                      <td className="tabular px-3.5 py-2.5 text-right text-muted-foreground">
                        {s.wordCount} palavras
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-muted-foreground">
                        ≈ {formatDuration(s.estimatedDurationSeconds)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-xs text-muted-foreground">
                        {s.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="criativos" className="mt-4">
          {creatives.length === 0 ? (
            <TabEmpty text="Nenhum criativo para esta oferta. Crie em Criativos → Novo Criativo." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <tbody>
                  {creatives.map((c) => (
                    <tr key={c.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3.5 py-2.5">
                        <Link
                          href={`/criativos/${c.code}`}
                          className="hover:underline"
                        >
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {c.code}
                          </span>{" "}
                          <span className="font-medium">{c.title}</span>
                        </Link>
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">
                        {c.format ?? EMPTY}
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-xs text-muted-foreground">
                        {c.scriptVersion != null ? `copy V${c.scriptVersion}` : EMPTY}
                      </td>
                      <td className="px-3.5 py-2.5 text-right text-xs text-muted-foreground">
                        {c.status.replace(/_/g, " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="angulos" className="mt-4">
          {offer.angles.length === 0 ? (
            <TabEmpty text="Nenhum ângulo cadastrado. Ângulos entram pela edição da oferta nesta fase; a gestão completa chega com o módulo de Criativos." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {offer.angles.map((angle) => (
                <div
                  key={angle.id}
                  className="rounded-lg border border-border/60 bg-card/40 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{angle.name}</p>
                    <StatusBadge
                      label={angle.status}
                      tone={
                        angle.status === "vencedor"
                          ? "win"
                          : angle.status === "perdedor"
                            ? "danger"
                            : angle.status === "testando"
                              ? "live"
                              : "neutral"
                      }
                      dot={false}
                    />
                  </div>
                  {angle.hypothesis && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        Hipótese:
                      </span>{" "}
                      {angle.hypothesis}
                    </p>
                  )}
                  {angle.result && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        Resultado:
                      </span>{" "}
                      {angle.result}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paginas" className="mt-4">
          {offer.pages.length === 0 ? (
            <TabEmpty text="Nenhuma página cadastrada." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <tbody>
                  {offer.pages.map((page) => (
                    <tr
                      key={page.id}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-3.5 py-2.5 font-medium">
                        {page.name} {page.version}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <StatusBadge
                          label={page.status.replace("_", " ")}
                          tone={
                            page.status === "no_ar"
                              ? "live"
                              : page.status === "pausada"
                                ? "warn"
                                : "neutral"
                          }
                          dot={false}
                        />
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground">
                        {page.headline ?? EMPTY}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {page.url ? (
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground underline hover:text-foreground"
                          >
                            abrir
                          </a>
                        ) : (
                          EMPTY
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trafego" className="mt-4">
          {offer.campaigns.length === 0 ? (
            <TabEmpty text="Nenhuma campanha cadastrada. O lançamento diário de métricas chega na Fase 7." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {offer.campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-lg border border-border/60 bg-card/40 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{campaign.name}</p>
                    <StatusBadge
                      label={campaign.status}
                      tone={campaign.status === "ativa" ? "live" : "neutral"}
                      dot={false}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {campaign.platform.toUpperCase()}
                    {campaign.account && ` · ${campaign.account}`}
                    {campaign.externalId && ` · ${campaign.externalId}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          {activity.length === 0 ? (
            <TabEmpty text="Nenhum evento registrado ainda." />
          ) : (
            <ol className="relative space-y-0 border-l border-border/60 pl-5">
              {activity.map((entry) => (
                <li key={entry.id} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[23px] top-1.5 size-2 rounded-full bg-border" />
                  <p className="text-sm">{entry.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>

      <OfferFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        users={users}
        mode="edit"
        offer={offer}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-0.5 text-sm">{value ?? <span className="text-muted-foreground/50">{EMPTY}</span>}</p>
    </div>
  );
}

function TabEmpty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
