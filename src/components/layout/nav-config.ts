import {
  Boxes,
  ClipboardList,
  Coins,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  Package,
  PenLine,
  Pickaxe,
  Settings,
  Smartphone,
  TrendingUp,
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
 * Sidebar (§4). A ordem segue o fluxo operacional:
 * o que esta acontecendo -> a producao -> os recursos -> a gestao.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/", label: "Visão Geral", icon: LayoutDashboard, soon: true },
    ],
  },
  {
    label: "Produção",
    items: [
      { href: "/ofertas", label: "Ofertas", icon: Package },
      { href: "/mineracao", label: "Mineração", icon: Pickaxe, soon: true },
      { href: "/criativos", label: "Criativos", icon: Boxes },
      { href: "/copies", label: "Copies", icon: PenLine },
      { href: "/testes", label: "Testes", icon: FlaskConical, soon: true },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/chips", label: "Chips", icon: Smartphone, soon: true },
      { href: "/trafego", label: "Tráfego", icon: TrendingUp, soon: true },
      {
        href: "/financeiro",
        label: "Financeiro",
        icon: Coins,
        readGroup: "expenses",
        soon: true,
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/tarefas", label: "Tarefas", icon: ListChecks, soon: true },
      { href: "/sops", label: "SOPs", icon: ClipboardList, soon: true },
      { href: "/ferramentas", label: "Ferramentas", icon: Wrench, soon: true },
      { href: "/usuarios", label: "Usuários", icon: Users, soon: true },
      { href: "/configuracoes", label: "Configurações", icon: Settings, soon: true },
    ],
  },
];
