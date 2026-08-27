import { ProducaoView } from "@/features/producao/components/producao-view";
import type { CreativeRow } from "@/features/creatives/types";
import type { ScriptRow } from "@/features/scripts/types";
import { requireAuth } from "@/lib/auth/guard";
import { listCreatives } from "@/services/firestore/creatives.repo";
import { listOffers } from "@/services/firestore/offers.repo";
import { listScripts } from "@/services/firestore/scripts.repo";
import { getTaxonomy } from "@/services/firestore/settings.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const metadata = { title: "Produção" };
export const dynamic = "force-dynamic";

/**
 * Produção (§13): reune Criativos e Copies numa unica area — a fila de
 * producao da equipe entre todas as ofertas. Mesmas collections, mesmos
 * componentes ja usados em /criativos e /copies; nada duplicado.
 */
export default async function ProducaoPage() {
  const ctx = await requireAuth();

  const [creatives, scripts, offers, users, taxonomy] = await Promise.all([
    listCreatives(),
    listScripts(),
    listOffers(),
    listUsers(),
    getTaxonomy(),
  ]);

  const offerById = new Map(offers.map((o) => [o.id, o]));
  const userById = new Map(users.map((u) => [u.id, u.fullName]));
  const scriptById = new Map(scripts.map((s) => [s.id, s]));

  const creativeRows: CreativeRow[] = creatives.map((creative) => {
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

  const scriptRows: ScriptRow[] = scripts.map((script) => {
    const offer = offerById.get(script.offerId);
    const angle = offer?.angles.find((a) => a.id === script.angleId);
    return {
      script,
      offerName: offer?.name ?? "—",
      offerCode: offer?.code ?? "—",
      angleName: angle?.name ?? null,
      responsibleName: script.responsibleId
        ? (userById.get(script.responsibleId) ?? null)
        : null,
    };
  });

  const offerOptions = offers.map((o) => ({
    id: o.id,
    code: o.code,
    name: o.name,
    angles: o.angles.map((a) => ({ id: a.id, name: a.name })),
  }));
  const userOptions = users
    .filter((u) => u.active)
    .map((u) => ({ id: u.id, name: u.fullName }));
  const scriptOptions = scripts.map((s) => ({
    id: s.id,
    code: s.code,
    title: s.title,
    offerId: s.offerId,
    currentVersion: s.currentVersion,
  }));

  return (
    <ProducaoView
      creativeRows={creativeRows}
      scriptRows={scriptRows}
      offers={offerOptions}
      scripts={scriptOptions}
      users={userOptions}
      taxonomy={taxonomy}
      role={ctx.role}
    />
  );
}
