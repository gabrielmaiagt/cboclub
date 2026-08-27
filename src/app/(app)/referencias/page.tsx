import { ReferencesView } from "@/features/references/components/references-view";
import { requireAuth } from "@/lib/auth/guard";
import { listMiningItems } from "@/services/firestore/mining.repo";
import { listReferences } from "@/services/firestore/references.repo";

export const metadata = { title: "Referências" };
export const dynamic = "force-dynamic";

/**
 * Swipe file (§8): banco de criativos EXTERNOS para modelar.
 * Quick capture em modal — salvar um link leva segundos.
 */
export default async function ReferencesPage() {
  const ctx = await requireAuth();

  const [references, miningItems] = await Promise.all([
    listReferences(),
    listMiningItems(),
  ]);

  const miningById = new Map(miningItems.map((m) => [m.id, m]));

  return (
    <ReferencesView
      rows={references.map((reference) => ({
        reference,
        miningName: reference.miningItemId
          ? (miningById.get(reference.miningItemId)?.name ?? null)
          : null,
      }))}
      miningItems={miningItems.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
      }))}
      role={ctx.role}
    />
  );
}
