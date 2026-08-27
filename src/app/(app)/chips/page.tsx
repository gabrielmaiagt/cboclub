import { ChipsView } from "@/features/chips/components/chips-view";
import type { ChipRow } from "@/features/chips/types";
import { requireAuth } from "@/lib/auth/guard";
import { getChipCapacity, listChips } from "@/services/firestore/chips.repo";
import { listOffers } from "@/services/firestore/offers.repo";
import { getAppSettings } from "@/services/firestore/settings.repo";
import { listUsers } from "@/services/firestore/users.repo";

export const metadata = { title: "Chips" };
export const dynamic = "force-dynamic";

/**
 * Inventario de chips (§39-§44): quantos existem, quantos aquecendo,
 * quantos prontos, quantos ativos, onde cada um esta sendo usado.
 */
export default async function ChipsPage() {
  const ctx = await requireAuth();

  const [chips, offers, users, capacity, settings] = await Promise.all([
    listChips(),
    listOffers(),
    listUsers(),
    getChipCapacity(),
    getAppSettings(),
  ]);

  const userNames = new Map(users.map((u) => [u.id, u.fullName]));
  const offerById = new Map(offers.map((o) => [o.id, o]));

  const rows: ChipRow[] = chips.map((chip) => ({
    chip,
    responsibleName: chip.responsibleId ? (userNames.get(chip.responsibleId) ?? null) : null,
    offerName: chip.currentOfferId ? (offerById.get(chip.currentOfferId)?.name ?? null) : null,
    offerCode: chip.currentOfferId ? (offerById.get(chip.currentOfferId)?.code ?? null) : null,
  }));

  return (
    <ChipsView
      rows={rows}
      capacity={capacity}
      chipsTarget={settings.chipsTarget}
      role={ctx.role}
      users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.fullName }))}
    />
  );
}
