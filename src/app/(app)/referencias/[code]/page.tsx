import { notFound } from "next/navigation";

import { ReferenceDetail } from "@/features/references/components/reference-detail";
import { requireAuth } from "@/lib/auth/guard";
import { listActivityByEntity } from "@/services/firestore/activity.repo";
import { getMiningItemById, listMiningItems } from "@/services/firestore/mining.repo";
import { listOffers } from "@/services/firestore/offers.repo";
import {
  getReferenceByCode,
  listModelagens,
} from "@/services/firestore/references.repo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

export default async function ReferenceDetailPage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { code } = await params;

  const reference = await getReferenceByCode(code);
  if (!reference) notFound();

  const [modelagens, miningItem, miningItems, offers, activity] =
    await Promise.all([
      listModelagens(reference.id),
      reference.miningItemId
        ? getMiningItemById(reference.miningItemId)
        : null,
      listMiningItems(),
      listOffers(),
      listActivityByEntity("reference", reference.id),
    ]);

  return (
    <ReferenceDetail
      reference={reference}
      modelagens={modelagens.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        status: s.status,
        currentVersion: s.currentVersion,
      }))}
      miningItem={
        miningItem
          ? { id: miningItem.id, code: miningItem.code, name: miningItem.name }
          : null
      }
      miningItems={miningItems.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
      }))}
      offers={offers.map((o) => ({ id: o.id, code: o.code, name: o.name }))}
      activity={activity}
      role={ctx.role}
    />
  );
}
