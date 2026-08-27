import { notFound } from "next/navigation";

import { MiningDetail } from "@/features/mining/components/mining-detail";
import { requireAuth } from "@/lib/auth/guard";
import { getMiningItemByCode } from "@/services/firestore/mining.repo";
import { getOfferById } from "@/services/firestore/offers.repo";
import { listReferences } from "@/services/firestore/references.repo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

/** Dossiê da oferta minerada (§19): informações + criativos encontrados + modelagem. */
export default async function MiningDetailPage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { code } = await params;

  const item = await getMiningItemByCode(code);
  if (!item) notFound();

  const [references, convertedOffer] = await Promise.all([
    listReferences({ miningItemId: item.id }),
    item.convertedOfferId ? getOfferById(item.convertedOfferId) : Promise.resolve(null),
  ]);

  return (
    <MiningDetail
      item={item}
      references={references}
      convertedOffer={convertedOffer ? { code: convertedOffer.code, name: convertedOffer.name } : null}
      role={ctx.role}
    />
  );
}
