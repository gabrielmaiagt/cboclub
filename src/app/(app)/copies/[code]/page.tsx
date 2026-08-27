import { notFound } from "next/navigation";

import { ScriptDetail } from "@/features/scripts/components/script-detail";
import { requireAuth } from "@/lib/auth/guard";
import { listActivityByEntity } from "@/services/firestore/activity.repo";
import { getOfferById } from "@/services/firestore/offers.repo";
import {
  getScriptByCode,
  listVersions,
} from "@/services/firestore/scripts.repo";
import { getAppSettings } from "@/services/firestore/settings.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

export default async function ScriptDetailPage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { code } = await params;

  const script = await getScriptByCode(code);
  if (!script) notFound();

  const [versions, offer, users, activity, settings] = await Promise.all([
    listVersions(script.id),
    getOfferById(script.offerId),
    listUsers(),
    listActivityByEntity("script", script.id),
    getAppSettings(),
  ]);

  return (
    <ScriptDetail
      script={script}
      versions={versions}
      offer={offer}
      activity={activity}
      role={ctx.role}
      wordsPerMinute={settings.copyWordsPerMinute}
      users={users
        .filter((u) => u.active)
        .map((u) => ({ id: u.id, name: u.fullName }))}
    />
  );
}
