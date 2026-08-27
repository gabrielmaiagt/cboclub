import { LayoutDashboard } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Visão Geral" };

/**
 * Dashboard.
 *
 * Deliberadamente vazio nesta fase (§57): o dashboard deve ler dados
 * reais das entidades, nunca numeros fake hardcoded. Ele e construido na
 * Fase 8, depois que metricas, financeiro e chips existirem.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral"
        description="O que está rodando, quanto entrou, quanto saiu e o que precisa ser feito hoje."
      />
      <EmptyState
        icon={<LayoutDashboard className="size-8" />}
        title="Dashboard entra na Fase 8"
        description="Ele vai consultar métricas, financeiro e chips reais. Construir agora significaria preencher com número inventado — que é exatamente o que o §57 proíbe."
      />
    </div>
  );
}
