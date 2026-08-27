"use client";

import { useRouter } from "next/navigation";
import {
  Boxes,
  Coins,
  FlaskConical,
  ListChecks,
  Package,
  PenLine,
  Pickaxe,
  Plus,
  Smartphone,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Quick Add global (§48, §56). Cada item leva direto para a tela onde
 * o CTA "Nova X" já é a acao primaria evidente — nao duplicamos a
 * logica de criacao aqui, so encurtamos o caminho ate ela.
 */
const ITEMS = [
  { href: "/ofertas", label: "Oferta", icon: Package },
  { href: "/producao", label: "Criativo", icon: Boxes },
  { href: "/producao", label: "Copy", icon: PenLine },
  { href: "/ofertas", label: "Teste (dentro da oferta)", icon: FlaskConical },
  { href: "/chips", label: "Chip", icon: Smartphone },
  { href: "/mineracao", label: "Mineração", icon: Pickaxe },
  { href: "/financeiro", label: "Despesa", icon: Coins },
  { href: "/ofertas", label: "Métricas (dentro da oferta)", icon: TrendingUp },
  { href: "/tarefas", label: "Tarefa", icon: ListChecks },
] as const;

export function QuickAdd() {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="size-4" />
          Adicionar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Criar rapidamente
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ITEMS.map((item) => (
          <DropdownMenuItem key={item.label} onSelect={() => router.push(item.href)}>
            <item.icon className="size-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
