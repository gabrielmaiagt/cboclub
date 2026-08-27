"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { upsertDailyMetricAction } from "@/app/actions/metrics";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { businessDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Registrar métricas do dia (§28-§29). Rápido por padrão: data + gasto +
 * leads + vendas + receita. Impressões/cliques/refunds/gateway/outros
 * custos ficam em "Mais detalhes" e nunca bloqueiam o registro.
 */
export function OfferMetricsDialog({
  offerId,
  offerCode,
}: {
  offerId: string;
  offerCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showMore, setShowMore] = useState(false);

  const empty = {
    date: businessDate(),
    spend: "",
    leads: "",
    sales: "",
    revenue: "",
    impressions: "",
    clicks: "",
    refunds: "",
    gatewayFees: "",
    additionalCosts: "",
  };
  const [form, setForm] = useState(empty);

  function num(v: string): number {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertDailyMetricAction(
        {
          date: form.date,
          offerId,
          spend: num(form.spend),
          leads: num(form.leads),
          sales: num(form.sales),
          revenue: num(form.revenue),
          impressions: num(form.impressions),
          clicks: num(form.clicks),
          refunds: num(form.refunds),
          gatewayFees: num(form.gatewayFees),
          additionalCosts: num(form.additionalCosts),
        },
        offerCode
      );
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }
      toast.success(`Métricas de ${form.date} registradas`);
      setOpen(false);
      setForm(empty);
      setShowMore(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" />
        Registrar métricas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar métricas do dia</DialogTitle>
            <DialogDescription>
              Registrar o mesmo dia de novo corrige o lançamento, não duplica.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gasto (R$)</Label>
                <Input
                  value={form.spend}
                  onChange={(e) => setForm((f) => ({ ...f, spend: e.target.value }))}
                  placeholder="150,00"
                  inputMode="decimal"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Receita (R$)</Label>
                <Input
                  value={form.revenue}
                  onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
                  placeholder="480,00"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Leads</Label>
                <Input
                  value={form.leads}
                  onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))}
                  placeholder="12"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vendas</Label>
                <Input
                  value={form.sales}
                  onChange={(e) => setForm((f) => ({ ...f, sales: e.target.value }))}
                  placeholder="3"
                  inputMode="numeric"
                />
              </div>
            </div>

            <Collapsible open={showMore} onOpenChange={setShowMore}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown
                  className={cn("size-3.5 transition-transform", showMore && "rotate-180")}
                />
                Mais detalhes (impressões, cliques, refunds...)
              </CollapsibleTrigger>
              <CollapsibleContent className="grid grid-cols-2 gap-3 pt-3">
                <div className="space-y-1.5">
                  <Label>Impressões</Label>
                  <Input
                    value={form.impressions}
                    onChange={(e) => setForm((f) => ({ ...f, impressions: e.target.value }))}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cliques</Label>
                  <Input
                    value={form.clicks}
                    onChange={(e) => setForm((f) => ({ ...f, clicks: e.target.value }))}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Refunds (R$)</Label>
                  <Input
                    value={form.refunds}
                    onChange={(e) => setForm((f) => ({ ...f, refunds: e.target.value }))}
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gateway (R$)</Label>
                  <Input
                    value={form.gatewayFees}
                    onChange={(e) => setForm((f) => ({ ...f, gatewayFees: e.target.value }))}
                    inputMode="decimal"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Outros custos (R$)</Label>
                  <Input
                    value={form.additionalCosts}
                    onChange={(e) => setForm((f) => ({ ...f, additionalCosts: e.target.value }))}
                    inputMode="decimal"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

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
    </>
  );
}
