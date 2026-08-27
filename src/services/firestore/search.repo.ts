import "server-only";

import { listChips } from "@/services/firestore/chips.repo";
import { listCreatives } from "@/services/firestore/creatives.repo";
import { listMiningItems } from "@/services/firestore/mining.repo";
import { listOffers } from "@/services/firestore/offers.repo";
import { listReferences } from "@/services/firestore/references.repo";
import { listScripts } from "@/services/firestore/scripts.repo";

/**
 * Busca global (§53). O volume atual (dezenas a centenas de docs por
 * collection) cabe inteiro na memoria do servidor sem indice especial —
 * cada handler reusa os mesmos list* ja usados pelas telas e filtra por
 * substring, sem full-text sofisticado. Revisar se o volume crescer.
 */
export interface SearchResult {
  type: "oferta" | "copy" | "criativo" | "chip" | "referencia" | "mineracao";
  code: string;
  title: string;
  subtitle: string | null;
  href: string;
}

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export async function globalSearch(query: string, limit = 6): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [offers, scripts, creatives, chips, references, mining] = await Promise.all([
    listOffers(),
    listScripts(),
    listCreatives(),
    listChips(),
    listReferences(),
    listMiningItems(),
  ]);

  const results: SearchResult[] = [];

  for (const o of offers) {
    if (matches(q, o.code, o.name, o.niche)) {
      results.push({
        type: "oferta",
        code: o.code,
        title: o.name,
        subtitle: o.niche,
        href: `/ofertas/${o.code}`,
      });
    }
  }
  for (const s of scripts.slice(0, 300)) {
    if (matches(q, s.code, s.title)) {
      results.push({ type: "copy", code: s.code, title: s.title, subtitle: null, href: `/copies/${s.code}` });
    }
  }
  for (const c of creatives.slice(0, 300)) {
    if (matches(q, c.code, c.title, c.hook)) {
      results.push({ type: "criativo", code: c.code, title: c.title, subtitle: c.hook, href: `/criativos/${c.code}` });
    }
  }
  for (const c of chips) {
    if (matches(q, c.code, c.operator)) {
      results.push({ type: "chip", code: c.code, title: c.code, subtitle: c.operator, href: `/chips/${c.code}` });
    }
  }
  for (const r of references) {
    if (matches(q, r.code, r.whySaved, r.advertiser)) {
      results.push({
        type: "referencia",
        code: r.code,
        title: r.whySaved ?? r.code,
        subtitle: r.advertiser,
        href: `/referencias/${r.code}`,
      });
    }
  }
  for (const m of mining) {
    if (matches(q, m.code, m.name, m.niche)) {
      results.push({ type: "mineracao", code: m.code, title: m.name, subtitle: m.niche, href: `/mineracao/${m.code}` });
    }
  }

  // Codigo exato primeiro, depois por tipo, capado por tipo
  const byType = new Map<string, SearchResult[]>();
  for (const r of results) {
    const list = byType.get(r.type) ?? [];
    list.push(r);
    byType.set(r.type, list);
  }

  const capped: SearchResult[] = [];
  for (const list of byType.values()) {
    list.sort((a, b) => {
      const aExact = a.code.toLowerCase() === q.toLowerCase() ? 0 : 1;
      const bExact = b.code.toLowerCase() === q.toLowerCase() ? 0 : 1;
      return aExact - bExact;
    });
    capped.push(...list.slice(0, limit));
  }

  return capped;
}
