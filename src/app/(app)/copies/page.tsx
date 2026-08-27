import { ScriptsView } from "@/features/scripts/components/scripts-view";
import type { ScriptRow } from "@/features/scripts/types";
import { requireAuth } from "@/lib/auth/guard";
import { listOffers } from "@/services/firestore/offers.repo";
import { listScripts } from "@/services/firestore/scripts.repo";
import { getTaxonomy } from "@/services/firestore/settings.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const metadata = { title: "Copies" };
export const dynamic = "force-dynamic";

/**
 * Listagem de copies (§19).
 * Palavras e ≈duracao vem do snapshot `current` — a subcollection de
 * versoes so e lida na pagina da copy.
 */
export default async function ScriptsPage() {
  const ctx = await requireAuth();

  const [scripts, offers, users, taxonomy] = await Promise.all([
    listScripts(),
    listOffers(),
    listUsers(),
    getTaxonomy(),
  ]);

  const offerById = new Map(offers.map((o) => [o.id, o]));
  const userById = new Map(users.map((u) => [u.id, u.fullName]));

  const rows: ScriptRow[] = scripts.map((script) => {
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

  return (
    <ScriptsView
      rows={rows}
      offers={offers.map((o) => ({
        id: o.id,
        code: o.code,
        name: o.name,
        angles: o.angles.map((a) => ({ id: a.id, name: a.name })),
      }))}
      users={users
        .filter((u) => u.active)
        .map((u) => ({ id: u.id, name: u.fullName }))}
      role={ctx.role}
      formats={taxonomy.creativeFormats.map((f) => ({
        slug: f.slug,
        name: f.name,
      }))}
    />
  );
}
