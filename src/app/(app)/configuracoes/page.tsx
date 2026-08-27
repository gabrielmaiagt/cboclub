import { ConfiguracoesView } from "@/features/configuracoes/components/configuracoes-view";
import { requireAuth } from "@/lib/auth/guard";
import { getAppSettings, getTaxonomy } from "@/services/firestore/settings.repo";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

/** Configurações (§52): simples, nunca painel técnico. */
export default async function ConfiguracoesPage() {
  const ctx = await requireAuth();
  const [settings, taxonomy] = await Promise.all([getAppSettings(), getTaxonomy()]);

  return <ConfiguracoesView settings={settings} taxonomy={taxonomy} role={ctx.role} />;
}
