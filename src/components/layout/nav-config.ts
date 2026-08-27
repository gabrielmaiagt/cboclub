import {
  Boxes,
  ClipboardList,
  Coins,
  LayoutDashboard,
  ListChecks,
  Package,
  Pickaxe,
  Settings,
  Smartphone,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { ReadGroup } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Leitura restrita: o item some para quem nao pode ver (§54). */
  readGroup?: ReadGroup;
  /** Ainda nao implementado — desabilitado na navegacao. */
  soon?: boolean;
}

export interface NavSection {
  label: string | null;
  items: NavItem[];
}

/**
 * Sidebar principal (§5): 7 itens, sem competir por atencao.
 * Produção reune Copies + Criativos numa unica area (§13).
 * Mineração reune Ofertas Mineradas + Criativos de Referência (§17).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/", label: "Visão Geral", icon: LayoutDashboard },
      { href: "/ofertas", label: "Ofertas", icon: Package },
      { href: "/producao", label: "Produção", icon: Boxes },
      { href: "/mineracao", label: "Mineração", icon: Pickaxe },
      { href: "/chips", label: "Chips", icon: Smartphone },
      {
        href: "/financeiro",
        label: "Financeiro",
        icon: Coins,
        readGroup: "expenses",
      },
      { href: "/tarefas", label: "Tarefas", icon: ListChecks },
    ],
  },
];

/** Administração / secundário (§5) — agrupado, fora da disputa principal. */
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { href: "/processos", label: "Processos", icon: ClipboardList },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
