import { MineracaoTabs } from "@/features/mining/components/mineracao-tabs";
import type { MiningRow } from "@/features/mining/types";
import { requireAuth } from "@/lib/auth/guard";
import { listMiningItems } from "@/services/firestore/mining.repo";
import { listOffers } from "@/services/firestore/offers.repo";
import { listReferences } from "@/services/firestore/references.repo";

export const metadata = { title: "Mineração" };
export const dynamic = "force-dynamic";

/**
 * Mineração (§17): ativos EXTERNOS — ofertas e criativos de terceiros
 * para estudar ou modelar. Nunca se mistura com Ofertas/Criativos
 * internos. Duas visoes sobre collections separadas (miningItems,
 * creativeReferences), reunidas so na apresentacao.
 */
export default async function MineracaoPage() {
  const ctx = await requireAuth();

  const [miningItems, references, offers] = await Promise.all([
    listMiningItems(),
    listReferences(),
    listOffers(),
  ]);

  const offerByMiningId = new Map(
    offers.filter((o) => o.miningItemId).map((o) => [o.miningItemId as string, o.code])
  );
  const miningById = new Map(miningItems.map((m) => [m.id, m]));

  const miningRows: MiningRow[] = miningItems.map((item) => ({
    item,
    offerCode: offerByMiningId.get(item.id) ?? null,
  }));

  const referenceRows = references.map((reference) => ({
    reference,
    miningName: reference.miningItemId
      ? (miningById.get(reference.miningItemId)?.name ?? null)
      : null,
  }));

  return (
    <MineracaoTabs
      miningRows={miningRows}
      referenceRows={referenceRows}
      miningItems={miningItems.map((m) => ({ id: m.id, code: m.code, name: m.name }))}
      role={ctx.role}
    />
  );
}
