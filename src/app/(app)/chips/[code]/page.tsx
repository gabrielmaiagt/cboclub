import { notFound } from "next/navigation";

import { ChipDetail } from "@/features/chips/components/chip-detail";
import { requireAuth } from "@/lib/auth/guard";
import { canRead } from "@/lib/auth/permissions";
import {
  getChipByCode,
  getChipPhoneNumber,
  listChipEvents,
} from "@/services/firestore/chips.repo";
import { listOffers } from "@/services/firestore/offers.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

export default async function ChipDetailPage({ params }: PageProps) {
  const ctx = await requireAuth();
  const { code } = await params;

  const chip = await getChipByCode(code);
  if (!chip) notFound();

  const canSeePhone = canRead(ctx.role, "chipSecret");

  const [events, offers, users, phoneNumber] = await Promise.all([
    listChipEvents(chip.id),
    listOffers(),
    listUsers(),
    canSeePhone ? getChipPhoneNumber(chip.id) : Promise.resolve(null),
  ]);

  return (
    <ChipDetail
      chip={chip}
      events={events}
      offers={offers
        .filter((o) => !o.deletedAt)
        .map((o) => ({ id: o.id, code: o.code, name: o.name }))}
      users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName }))}
      role={ctx.role}
      phoneNumber={phoneNumber}
      canSeePhone={canSeePhone}
    />
  );
}
