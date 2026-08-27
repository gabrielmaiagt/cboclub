"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { setOfferHealthAction } from "@/app/actions/offers";
import { EntityCode } from "@/components/shared/entity-code";
import { PeriodSelector } from "@/components/shared/period-selector";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreativeFormSheet } from "@/features/creatives/components/creative-form-sheet";
import { OfferChipsTab } from "@/features/offers/components/offer-chips-tab";
import { OfferFinanceTab } from "@/features/offers/components/offer-finance-tab";
import { OfferFormSheet } from "@/features/offers/components/offer-form-sheet";
import { OfferCharts } from "@/features/offers/components/offer-charts";
import { OfferMetricsDialog } from "@/features/offers/components/offer-metrics-dialog";
import { OfferStatusMenu } from "@/features/offers/components/offer-status-menu";
import { OfferTestsTab } from "@/features/offers/components/offer-tests-tab";
import { ScriptFormSheet } from "@/features/scripts/components/script-form-sheet";
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
  signedPercent,
} from "@/lib/format";
import { delta } from "@/lib/metrics";
import type { DerivedMetrics } from "@/lib/metrics";
import { PERIOD_COMPARISON_LABELS, PERIOD_LABELS, type Period } from "@/lib/period";
import {
  CREATIVE_STATUS_LABELS,
  CREATIVE_STATUS_TONE,
  OFFER_HEALTH_LABELS,
  OFFER_HEALTH_TONE,
  SCRIPT_STATUS_LABELS,
  SCRIPT_STATUS_TONE,
  TONE_DOT,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  OFFER_HEALTHS,
  type ActivityEntry,
  type AppRole,
  type Chip,
  type CreativeStatus,
  type Experiment,
  type LedgerEntry,
  type Offer,
  type ScriptStatus,
  type Taxonomy,
} from "@/types/domain";

interface SeriesPoint {
  date: string;
  spend: number;
  revenue: number;
  roas: number | null;
}

interface ScriptSummary {
  id: string;
  code: string;
  title: string;
  status: string;
  currentVersion: number;
  wordCount: number;
  estimatedDurationSeconds: number;
}

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
  period: Period;
  metrics: DerivedMetrics;
  previousMetrics: DerivedMetrics | null;
  today: DerivedMetrics;
  series: SeriesPoint[];
  activity: ActivityEntry[];
  role: AppRole;
  users: UserOption[];
  scripts: ScriptSummary[];
  creatives: CreativeSummary[];
  taxonomy: Taxonomy;
  experiments: Experiment[];
  chipsLinked: Chip[];
  chipsAvailable: Chip[];
  ledger: LedgerEntry[];
  canSeeFinance: boolean;
}

function Stat({
  label,
  value,
  accent,
  deltaValue,
  comparisonLabel,
}: {
  label: string;
  value: string;
  accent?: "win" | "danger";
  deltaValue?: number | null;
  comparisonLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-3.5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-lg font-semibold leading-none",
          accent === "win" && "text-status-win",
          accent === "danger" && "text-status-danger"
        )}
      >
        {value}
      </p>
      {deltaValue != null && comparisonLabel && (
        <p
          className={cn(
            "tabular mt-1 text-[11px]",
            deltaValue > 0 && "text-status-win",
            deltaValue < 0 && "text-status-danger",
            deltaValue === 0 && "text-muted-foreground"
          )}
        >
          {signedPercent(deltaValue)} {comparisonLabel}
        </p>
      )}
    </div>
  );
}

/**
 * Workspace da oferta: tudo daquela oferta, nada das outras.
 * Header com identidade + indicadores; abas com os ativos relacionados.
 */
export function OfferDetail({
  offer,
  period,
  metrics,
  previousMetrics,
  today,
  series,
  activity,
  role,
  users,
  scripts,
  creatives,
  taxonomy,
  experiments,
  chipsLinked,
  chipsAvailable,
  ledger,
  canSeeFinance,
}: OfferDetailProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [newCopyOpen, setNewCopyOpen] = useState(false);
  const [newCreativeOpen, setNewCreativeOpen] = useState(false);
  const editableOffer = canWrite(role, "offers");
  const editableCreative = canWrite(role, "creative");

  async function handleHealthChange(health: (typeof OFFER_HEALTHS)[number]) {
    const result = await setOfferHealthAction({ id: offer.id, health });
    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível alterar a saúde.");
      return;
    }
    router.refresh();
  }

  const profitAccent =
    metrics.operationalProfit > 0
      ? "win"
      : metrics.operationalProfit < 0
        ? "danger"
        : undefined;
  const comparisonLabel = PERIOD_COMPARISON_LABELS[period];

  // Opcoes para os formularios abertos DENTRO do workspace: so esta oferta
  const offerAsOption = [
    {
      id: offer.id,
      code: offer.code,
      name: offer.name,
      angles: offer.angles.map((a) => ({ id: a.id, name: a.name })),
    },
  ];
  const scriptOptions = scripts.map((s) => ({
    id: s.id,
    code: s.code,
    title: s.title,
    offerId: offer.id,
    currentVersion: s.currentVersion,
  }));

  return (
    <div className="space-y-6">
      {/* ── Header do workspace ─────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {offer.name}
            </h1>
            <OfferStatusMenu offer={offer} editable={editableOffer} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <EntityCode code={offer.code} className="text-xs" />
            {offer.niche && <span>{offer.niche}</span>}
            {offer.ticketPrice != null && (
              <span className="tabular">Ticket {money(offer.ticketPrice)}</span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={!editableOffer}
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/50 disabled:cursor-default"
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
                      className={cn(
                        "size-2 rounded-full",
                        TONE_DOT[OFFER_HEALTH_TONE[h]]
                      )}
                    />
                    {OFFER_HEALTH_LABELS[h]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {editableOffer && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="size-4" />
            Editar oferta
          </Button>
        )}
      </div>

      {/* ── Indicadores do periodo ───────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {PERIOD_LABELS[period]}
        </h2>
        <PeriodSelector value={period} basePath={`/ofertas/${offer.code}`} />
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
        <Stat
          label="Investimento"
          value={money(metrics.spend)}
          deltaValue={previousMetrics ? delta(metrics.spend, previousMetrics.spend) : null}
          comparisonLabel={comparisonLabel}
        />
        <Stat
          label="Receita"
          value={money(metrics.revenue)}
          deltaValue={
            previousMetrics ? delta(metrics.revenue, previousMetrics.revenue) : null
          }
          comparisonLabel={comparisonLabel}
        />
        <Stat
          label="Lucro"
          value={money(metrics.operationalProfit)}
          accent={profitAccent}
          deltaValue={
            previousMetrics
              ? delta(metrics.operationalProfit, previousMetrics.operationalProfit)
              : null
          }
          comparisonLabel={comparisonLabel}
        />
        <Stat label="ROAS" value={multiplier(metrics.roas)} />
        <Stat label="ROI" value={percent(metrics.roi)} />
        <Stat
          label="Vendas"
          value={integer(metrics.sales)}
          deltaValue={
            previousMetrics ? delta(metrics.sales, previousMetrics.sales) : null
          }
          comparisonLabel={comparisonLabel}
        />
        <Stat label="CPA" value={money(metrics.cpa)} />
        <Stat label="Leads" value={integer(metrics.leads)} />
        <Stat label="CPL" value={money(metrics.cpl)} />
      </div>

      {/* ── Abas do workspace ───────────────────────────────────── */}
      <Tabs defaultValue="visao">
        <TabsList className="thin-scroll h-11 w-full justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="copies">
            Copies{scripts.length > 0 && ` · ${scripts.length}`}
          </TabsTrigger>
          <TabsTrigger value="criativos">
            Criativos{creatives.length > 0 && ` · ${creatives.length}`}
          </TabsTrigger>
          <TabsTrigger value="testes">Testes</TabsTrigger>
          <TabsTrigger value="chips">Chips</TabsTrigger>
          <TabsTrigger value="trafego">
            Tráfego{offer.campaigns.length > 0 && ` · ${offer.campaigns.length}`}
          </TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ── Visão Geral: estrategia + graficos + angulos + paginas ── */}
        <TabsContent value="visao" className="mt-5 space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4 lg:col-span-1">
              <Info label="Promessa" value={offer.mainPromise} />
              <Info label="Mecanismo" value={offer.mechanism} />
              <Info label="Público" value={offer.targetAudience} />
              <Info label="Próxima ação" value={offer.nextAction} />
              {offer.notes && <Info label="Observações" value={offer.notes} />}
              <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3 text-sm text-muted-foreground">
                <span>Hoje: {money(today.spend)}</span>
                <span className="tabular">{multiplier(today.roas)} ROAS</span>
              </div>
            </div>

            <div className="lg:col-span-2">
              <OfferCharts series={series} />
            </div>
          </div>

          {/* Angulos, dentro da visao geral */}
          {offer.angles.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-sm font-semibold">Ângulos</h3>
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
                        <span className="font-medium text-foreground/90">
                          Hipótese:
                        </span>{" "}
                        {angle.hypothesis}
                      </p>
                    )}
                    {angle.result && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/90">
                          Resultado:
                        </span>{" "}
                        {angle.result}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paginas, dentro da visao geral */}
          {offer.pages.length > 0 && (
            <div>
              <h3 className="mb-2.5 text-sm font-semibold">Páginas</h3>
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
                              className="text-sm text-muted-foreground underline hover:text-foreground"
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
            </div>
          )}
        </TabsContent>

        {/* ── Copies da oferta ────────────────────────────────────── */}
        <TabsContent value="copies" className="mt-5 space-y-4">
          {editableCreative && (
            <Button size="sm" onClick={() => setNewCopyOpen(true)} className="gap-1.5">
              <Plus className="size-4" />
              Nova copy para esta oferta
            </Button>
          )}
          {scripts.length === 0 ? (
            <TabEmpty text="Nenhuma copy ainda. Toda copy nasce como V1 e evolui por versões." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <tbody>
                  {scripts.map((s) => (
                    <tr key={s.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3.5 py-3">
                        <Link href={`/copies/${s.code}`} className="hover:underline">
                          <span className="font-mono text-xs text-muted-foreground">
                            {s.code}
                          </span>{" "}
                          <span className="font-medium">{s.title}</span>
                        </Link>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="rounded bg-accent/60 px-1.5 py-0.5 text-xs font-medium">
                          V{s.currentVersion}
                        </span>
                      </td>
                      <td className="tabular px-3.5 py-3 text-right text-muted-foreground">
                        {s.wordCount} palavras
                      </td>
                      <td className="px-3.5 py-3 text-right text-muted-foreground">
                        ≈ {formatDuration(s.estimatedDurationSeconds)}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <StatusBadge
                          label={SCRIPT_STATUS_LABELS[s.status as ScriptStatus] ?? s.status}
                          tone={SCRIPT_STATUS_TONE[s.status as ScriptStatus] ?? "neutral"}
                          dot={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Criativos da oferta ─────────────────────────────────── */}
        <TabsContent value="criativos" className="mt-5 space-y-4">
          {editableCreative && (
            <Button
              size="sm"
              onClick={() => setNewCreativeOpen(true)}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Novo criativo para esta oferta
            </Button>
          )}
          {creatives.length === 0 ? (
            <TabEmpty text="Nenhum criativo ainda." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <tbody>
                  {creatives.map((c) => (
                    <tr key={c.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3.5 py-3">
                        <Link href={`/criativos/${c.code}`} className="hover:underline">
                          <span className="font-mono text-xs text-muted-foreground">
                            {c.code}
                          </span>{" "}
                          <span className="font-medium">{c.title}</span>
                        </Link>
                      </td>
                      <td className="px-3.5 py-3 text-muted-foreground">
                        {c.format ?? EMPTY}
                      </td>
                      <td className="px-3.5 py-3 text-center text-xs text-muted-foreground">
                        {c.scriptVersion != null ? `copy V${c.scriptVersion}` : EMPTY}
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <StatusBadge
                          label={
                            CREATIVE_STATUS_LABELS[c.status as CreativeStatus] ??
                            c.status
                          }
                          tone={
                            CREATIVE_STATUS_TONE[c.status as CreativeStatus] ??
                            "neutral"
                          }
                          dot={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="testes" className="mt-5">
          <OfferTestsTab
            offerId={offer.id}
            offerCode={offer.code}
            experiments={experiments}
            users={users}
            editable={canWrite(role, "traffic")}
          />
        </TabsContent>
        <TabsContent value="chips" className="mt-5">
          <OfferChipsTab
            offerId={offer.id}
            chipsLinked={chipsLinked}
            chipsAvailable={chipsAvailable}
            editable={canWrite(role, "ops")}
          />
        </TabsContent>
        <TabsContent value="financeiro" className="mt-5">
          {canSeeFinance ? (
            <OfferFinanceTab
              offerId={offer.id}
              ledger={ledger}
              editable={canWrite(role, "finance")}
            />
          ) : (
            <TabEmpty text="Você não tem permissão para ver o financeiro desta oferta." />
          )}
        </TabsContent>

        {/* ── Trafego ─────────────────────────────────────────────── */}
        <TabsContent value="trafego" className="mt-5 space-y-4">
          {canWrite(role, "traffic") && (
            <OfferMetricsDialog offerId={offer.id} offerCode={offer.code} />
          )}
          {offer.campaigns.length === 0 ? (
            <TabEmpty text="Nenhuma campanha cadastrada. Registre as métricas do dia acima." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {offer.campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-lg border border-border/60 bg-card/40 p-4"
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

        {/* ── Historico ───────────────────────────────────────────── */}
        <TabsContent value="historico" className="mt-5">
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

      <ScriptFormSheet
        open={newCopyOpen}
        onOpenChange={setNewCopyOpen}
        offers={offerAsOption}
        users={users}
        formats={taxonomy.creativeFormats.map((f) => ({
          slug: f.slug,
          name: f.name,
        }))}
        lockedOfferId={offer.id}
      />

      <CreativeFormSheet
        open={newCreativeOpen}
        onOpenChange={setNewCreativeOpen}
        mode="create"
        offers={offerAsOption}
        scripts={scriptOptions}
        users={users}
        taxonomy={taxonomy}
        lockedOfferId={offer.id}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm">
        {value ?? <span className="text-muted-foreground/60">{EMPTY}</span>}
      </p>
    </div>
  );
}

function TabEmpty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
