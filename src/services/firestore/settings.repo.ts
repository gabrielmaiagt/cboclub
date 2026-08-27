import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COL, DOC } from "@/lib/firebase/collections";
import type { AppSettings, Taxonomy } from "@/types/domain";

/** Defaults quando o doc ainda nao existe (projeto recem-criado). */
const DEFAULT_APP: AppSettings = {
  copyWordsPerMinute: 150,
  chipsTarget: 50,
  currency: "BRL",
  defaultCountry: "BR",
};

const DEFAULT_TAXONOMY: Taxonomy = {
  creativeFormats: [],
  tags: [],
  angleLibrary: [],
};

export async function getAppSettings(): Promise<AppSettings> {
  const snap = await adminDb()
    .collection(COL.settings)
    .doc(DOC.settingsApp)
    .get();
  if (!snap.exists) return DEFAULT_APP;
  const d = snap.data()!;
  return {
    copyWordsPerMinute: d.copyWordsPerMinute ?? DEFAULT_APP.copyWordsPerMinute,
    chipsTarget: d.chipsTarget ?? DEFAULT_APP.chipsTarget,
    currency: d.currency ?? DEFAULT_APP.currency,
    defaultCountry: d.defaultCountry ?? DEFAULT_APP.defaultCountry,
  };
}

export async function getTaxonomy(): Promise<Taxonomy> {
  const snap = await adminDb()
    .collection(COL.settings)
    .doc(DOC.settingsTaxonomy)
    .get();
  if (!snap.exists) return DEFAULT_TAXONOMY;
  const d = snap.data()!;
  return {
    creativeFormats: (d.creativeFormats ?? [])
      .filter((f: { active?: boolean }) => f.active !== false)
      .sort(
        (a: { sortOrder?: number }, b: { sortOrder?: number }) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    tags: d.tags ?? [],
    angleLibrary: d.angleLibrary ?? [],
  };
}
