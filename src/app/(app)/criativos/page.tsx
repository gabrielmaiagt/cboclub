import { CreativesView } from "@/features/creatives/components/creatives-view";
import type { CreativeRow } from "@/features/creatives/types";
import { requireAuth } from "@/lib/auth/guard";
import { listCreatives } from "@/services/firestore/creatives.repo";
import { listOffers } from "@/services/firestore/offers.repo";
import { listScripts } from "@/services/firestore/scripts.repo";
import { getTaxonomy } from "@/services/firestore/settings.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const metadata = { title: "Criativos" };
export const dynamic = "force-dynamic";

/**
 * Listagem de criativos.
 *
 * Custo: 1 query de criativos + 1 de ofertas + 1 de copies + 1 de
 * usuarios + 1 doc de taxonomia. Nomes de oferta/angulo/editor sao
 * resolvidos aqui em memoria — nada denormalizado nos documentos.
 */
export default async function CreativesPage() {
  const ctx = await requireAuth();

  const [creatives, offers, scripts, users, taxonomy] = await Promise.all([
    listCreatives(),
    listOffers(),
    listScripts(),
    listUsers(),
    getTaxonomy(),
  ]);

  const offerById = new Map(offers.map((o) => [o.id, o]));
  const userById = new Map(users.map((u) => [u.id, u.fullName]));
  const scriptById = new Map(scripts.map((s) => [s.id, s]));

  const rows: CreativeRow[] = creatives.map((creative) => {
    const offer = offerById.get(creative.offerId);
    const angle = offer?.angles.find((a) => a.id === creative.angleId);
    return {
      creative,
      offerName: offer?.name ?? "—",
      offerCode: offer?.code ?? "—",
      angleName: angle?.name ?? null,
      editorName: creative.editorId
        ? (userById.get(creative.editorId) ?? null)
        : null,
      scriptCode: creative.scriptId
        ? (scriptById.get(creative.scriptId)?.code ?? null)
        : null,
    };
  });

  return (
    <CreativesView
      rows={rows}
      offers={offers.map((o) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        angles: o.angles.map((a) => ({ id: a.id, name: a.name })),
      }))}
      scripts={scripts.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        offerId: s.offerId,
        currentVersion: s.currentVersion,
      }))}
      users={users
        .filter((u) => u.active)
        .map((u) => ({ id: u.id, name: u.fullName }))}
      taxonomy={taxonomy}
      role={ctx.role}
    />
  );
}
