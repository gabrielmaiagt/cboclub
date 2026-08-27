"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PenLine, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { EntityCode } from "@/components/shared/entity-code";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScriptFormSheet } from "@/features/scripts/components/script-form-sheet";
import type { OfferOption, ScriptRow, UserOption } from "@/features/scripts/types";
import { canWrite } from "@/lib/auth/permissions";
import { duration, EMPTY, integer } from "@/lib/format";
import { SCRIPT_STATUS_LABELS, SCRIPT_STATUS_TONE } from "@/lib/status";
import type { AppRole } from "@/types/domain";

const ALL = "__all__";

export function ScriptsView({
  rows,
  offers,
  users,
  role,
  formats = [],
}: {
  rows: ScriptRow[];
  offers: OfferOption[];
  users: UserOption[];
  role: AppRole;
  formats?: { slug: string; name: string }[];
}) {
  const [offerFilter, setOfferFilter] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const editable = canWrite(role, "creative");

  const filtered = useMemo(
    () =>
      offerFilter === ALL
        ? rows
        : rows.filter((r) => r.script.offerId === offerFilter),
    [rows, offerFilter]
  );

  /** Sistema orientado por oferta: a listagem agrupa por oferta. */
  const groups = useMemo(() => {
    const map = new Map<string, ScriptRow[]>();
    for (const row of filtered) {
      const list = map.get(row.script.offerId);
      if (list) list.push(row);
      else map.set(row.script.offerId, [row]);
    }
    return [...map.entries()].map(([offerId, items]) => ({
      offerId,
      offerCode: items[0].offerCode,
      offerName: items[0].offerName,
      items,
    }));
  }, [filtered]);

  const newButton = editable ? (
    <Button onClick={() => setFormOpen(true)} className="gap-2">
      <Plus className="size-4" />
      Nova Copy
    </Button>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Copies"
        description={`${rows.length} ${rows.length === 1 ? "copy" : "copies"} no sistema.`}
        action={
          <div className="flex items-center gap-2">
            <Select value={offerFilter} onValueChange={setOfferFilter}>
              <SelectTrigger className="h-8 w-52 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as ofertas</SelectItem>
                {offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.code} · {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newButton}
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<PenLine className="size-8" />}
          title="Nenhuma copy ainda"
          description="Toda copy nasce como V1 e evolui por versões — nada é sobrescrito."
          action={newButton}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.offerId}>
              <Link
                href={`/ofertas/${group.offerCode}`}
                className="group mb-3 flex items-baseline gap-2.5"
              >
                <h2 className="text-base font-semibold group-hover:underline">
                  {group.offerName}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {group.offerCode}
                </span>
                <span className="text-sm text-muted-foreground">
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "copy" : "copies"}
                </span>
              </Link>

              <div className="overflow-x-auto rounded-lg border border-border/60">
                <Table className="table-dense">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[36%]">Copy</TableHead>
                      <TableHead>Ângulo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Versão</TableHead>
                      <TableHead className="text-right">Palavras</TableHead>
                      <TableHead className="text-right">≈ Locução</TableHead>
                      <TableHead>Editor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map(({ script, angleName, responsibleName }) => (
                      <TableRow key={script.id} className="group/row">
                        <TableCell>
                          <Link
                            href={`/copies/${script.code}`}
                            className="block min-w-0"
                          >
                            <p className="truncate text-sm font-medium group-hover/row:underline">
                              {script.title}
                            </p>
                            <EntityCode code={script.code} />
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {angleName ?? EMPTY}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={SCRIPT_STATUS_LABELS[script.status]}
                            tone={SCRIPT_STATUS_TONE[script.status]}
                          />
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="rounded bg-accent/60 px-1.5 py-0.5 text-xs font-medium">
                            V{script.currentVersion}
                          </span>
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {integer(script.current.wordCount)}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {duration(script.current.estimatedDurationSeconds)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {responsibleName ?? EMPTY}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
      )}

      <ScriptFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        offers={offers}
        users={users}
        formats={formats}
      />
    </div>
  );
}
