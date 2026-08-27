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

// ── Escrita (§52) ───────────────────────────────────────────────────

import { FieldValue } from "firebase-admin/firestore";

export async function updateAppSettings(
  patch: Partial<AppSettings>,
  actorUid: string
): Promise<void> {
  await adminDb()
    .collection(COL.settings)
    .doc(DOC.settingsApp)
    .set({ ...patch, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid }, { merge: true });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function addCreativeFormat(name: string, actorUid: string): Promise<void> {
  const taxonomy = await getTaxonomy();
  const slug = slugify(name);
  if (taxonomy.creativeFormats.some((f) => f.slug === slug)) return;
  const next = [
    ...taxonomy.creativeFormats,
    { slug, name, active: true, sortOrder: (taxonomy.creativeFormats.length + 1) * 10 },
  ];
  await adminDb()
    .collection(COL.settings)
    .doc(DOC.settingsTaxonomy)
    .set(
      { creativeFormats: next, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid },
      { merge: true }
    );
}

export async function addTag(name: string, color: string, actorUid: string): Promise<void> {
  const taxonomy = await getTaxonomy();
  const slug = slugify(name);
  if (taxonomy.tags.some((t) => t.slug === slug)) return;
  const next = [...taxonomy.tags, { slug, name, color }];
  await adminDb()
    .collection(COL.settings)
    .doc(DOC.settingsTaxonomy)
    .set({ tags: next, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid }, { merge: true });
}

export async function addLibraryAngle(
  name: string,
  description: string | null,
  actorUid: string
): Promise<void> {
  const taxonomy = await getTaxonomy();
  const slug = slugify(name);
  if (taxonomy.angleLibrary.some((a) => a.slug === slug)) return;
  const next = [...taxonomy.angleLibrary, { slug, name, description }];
  await adminDb()
    .collection(COL.settings)
    .doc(DOC.settingsTaxonomy)
    .set(
      { angleLibrary: next, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid },
      { merge: true }
    );
}
