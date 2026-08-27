"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createOfferAction, updateOfferAction } from "@/app/actions/offers";
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
import type { UserOption } from "@/features/offers/types";
import { OFFER_HEALTH_LABELS, PRIORITY_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  OFFER_HEALTHS,
  OFFER_STATUS_LABELS,
  OFFER_STATUSES,
  PRIORITIES,
  type Offer,
} from "@/types/domain";

interface OfferFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserOption[];
  mode: "create" | "edit";
  offer?: Offer;
}

const NONE = "__none__";

interface FormState {
  name: string;
  niche: string;
  subNiche: string;
  mainPromise: string;
  mechanism: string;
  targetAudience: string;
  ticketPrice: string;
  status: string;
  health: string;
  priority: string;
  responsibleId: string;
  nextAction: string;
  nextActionDue: string;
  notes: string;
}

function emptyState(): FormState {
  return {
    name: "",
    niche: "",
    subNiche: "",
    mainPromise: "",
    mechanism: "",
    targetAudience: "",
    ticketPrice: "",
    status: "minerada",
    health: "saudavel",
    priority: "media",
    responsibleId: NONE,
    nextAction: "",
    nextActionDue: "",
    notes: "",
  };
}

function fromOffer(offer: Offer): FormState {
  return {
    name: offer.name,
    niche: offer.niche ?? "",
    subNiche: offer.subNiche ?? "",
    mainPromise: offer.mainPromise ?? "",
    mechanism: offer.mechanism ?? "",
    targetAudience: offer.targetAudience ?? "",
    ticketPrice: offer.ticketPrice != null ? String(offer.ticketPrice) : "",
    status: offer.status,
    health: offer.health,
    priority: offer.priority,
    responsibleId: offer.responsibleId ?? NONE,
    nextAction: offer.nextAction ?? "",
    nextActionDue: offer.nextActionDue ?? "",
    notes: offer.notes ?? "",
  };
}

export function OfferFormSheet({
  open,
  onOpenChange,
  users,
  mode,
  offer,
}: OfferFormSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  // Na edicao os detalhes ja interessam; na criacao ficam recolhidos
  const [showMore, setShowMore] = useState(false);

  // Recarrega o formulario sempre que o sheet abre
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset do formulario ao abrir, nao um loop
    setForm(offer ? fromOffer(offer) : emptyState());
    setErrors({});
    setShowMore(mode === "edit");
  }, [open, offer, mode]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});

    const ticket = form.ticketPrice.trim().replace(",", ".");
    const payload = {
      name: form.name.trim(),
      niche: form.niche,
      subNiche: form.subNiche,
      country: "BR",
      language: "pt-BR",
      mainPromise: form.mainPromise,
      mechanism: form.mechanism,
      targetAudience: form.targetAudience,
      ticketPrice: ticket ? Number(ticket) : null,
      status: form.status,
      health: form.health,
      priority: form.priority,
      responsibleId: form.responsibleId === NONE ? null : form.responsibleId,
      miningItemId: offer?.miningItemId ?? null,
      nextAction: form.nextAction,
      nextActionDue: form.nextActionDue || null,
      launchDate: offer?.launchDate ?? null,
      validationDate: offer?.validationDate ?? null,
      scalingDate: offer?.scalingDate ?? null,
      notes: form.notes,
      angles: offer?.angles ?? [],
      pages: offer?.pages ?? [],
      campaigns: offer?.campaigns ?? [],
    };

    if (ticket && Number.isNaN(Number(ticket))) {
      setErrors({ ticketPrice: ["Informe um número válido."] });
      return;
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOfferAction(payload)
          : await updateOfferAction(offer!.id, payload);

      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        toast.error(result.error ?? "Não foi possível salvar.");
        return;
      }

      if (mode === "create" && "data" in result && result.data) {
        const created = result.data as { code: string };
        toast.success(`${created.code} criada`);
        onOpenChange(false);
        router.push(`/ofertas/${created.code}`);
      } else {
        toast.success("Oferta atualizada");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  function fieldError(name: keyof FormState) {
    return errors[name]?.[0];
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>
            {mode === "create" ? "Nova Oferta" : `Editar ${offer?.code}`}
          </SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "O código é gerado automaticamente ao salvar."
              : "Alterações entram na timeline da oferta."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="thin-scroll flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Quick capture (§18): nome + status + responsavel. So. */}
            <Field label="Nome da oferta" error={fieldError("name")} required>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Bolsa de Crochê de Luxo"
                autoFocus
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {OFFER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {OFFER_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Inteligencia estrategica: preenchida depois, sem bloquear */}
            <Collapsible open={showMore} onOpenChange={setShowMore}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    showMore && "rotate-180"
                  )}
                />
                Mais detalhes (promessa, ticket, público...)
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <Field label="Promessa principal">
                  <Textarea
                    value={form.mainPromise}
                    onChange={(e) => set("mainPromise", e.target.value)}
                    placeholder="Bolsa artesanal de luxo por menos de R$50"
                    rows={2}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ticket (R$)" error={fieldError("ticketPrice")}>
                    <Input
                      value={form.ticketPrice}
                      onChange={(e) => set("ticketPrice", e.target.value)}
                      placeholder="39,90"
                      inputMode="decimal"
                    />
                  </Field>
                  <Field label="Mecanismo">
                    <Input
                      value={form.mechanism}
                      onChange={(e) => set("mechanism", e.target.value)}
                      placeholder="Produção artesanal"
                    />
                  </Field>
                </div>

                <Field label="Público-alvo">
                  <Textarea
                    value={form.targetAudience}
                    onChange={(e) => set("targetAudience", e.target.value)}
                    placeholder="Mulheres 25-45, classe C/B"
                    rows={2}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nicho">
                    <Input
                      value={form.niche}
                      onChange={(e) => set("niche", e.target.value)}
                      placeholder="moda feminina"
                    />
                  </Field>
                  <Field label="Sub-nicho">
                    <Input
                      value={form.subNiche}
                      onChange={(e) => set("subNiche", e.target.value)}
                      placeholder="acessórios"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Saúde">
                    <Select
                      value={form.health}
                      onValueChange={(v) => set("health", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFER_HEALTHS.map((h) => (
                          <SelectItem key={h} value={h}>
                            {OFFER_HEALTH_LABELS[h]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Prioridade">
                    <Select
                      value={form.priority}
                      onValueChange={(v) => set("priority", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <Field label="Próxima ação">
                    <Input
                      value={form.nextAction}
                      onChange={(e) => set("nextAction", e.target.value)}
                      placeholder="Editar 4 vídeos do ângulo luxo"
                    />
                  </Field>
                  <Field label="Prazo">
                    <Input
                      type="date"
                      value={form.nextActionDue}
                      onChange={(e) => set("nextActionDue", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Observações">
                  <Textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={3}
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
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Criar oferta" : "Salvar"}
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
