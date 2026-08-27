import { notFound } from "next/navigation";

import { CreativeDetail } from "@/features/creatives/components/creative-detail";
import { requireAuth } from "@/lib/auth/guard";
import { listActivityByEntity } from "@/services/firestore/activity.repo";
import { getCreativeByCode } from "@/services/firestore/creatives.repo";
import { getOfferById, listOffers } from "@/services/firestore/offers.repo";
import { getScriptById, listScripts } from "@/services/firestore/scripts.repo";
import { getTaxonomy } from "@/services/firestore/settings.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

export default async function CreativeDetailPage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { code } = await params;

  const creative = await getCreativeByCode(code);
  if (!creative) notFound();

  const [offer, script, offers, scripts, users, taxonomy, activity] =
    await Promise.all([
      getOfferById(creative.offerId),
      creative.scriptId ? getScriptById(creative.scriptId) : null,
      listOffers(),
      listScripts(),
      listUsers(),
      getTaxonomy(),
      listActivityByEntity("creative", creative.id),
    ]);

  return (
    <CreativeDetail
      creative={creative}
      offer={offer}
      script={script}
      activity={activity}
      role={ctx.role}
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
    />
  );
}
