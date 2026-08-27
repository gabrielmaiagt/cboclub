import type { Creative, Taxonomy } from "@/types/domain";

export interface UserOption {
  id: string;
  name: string;
}

/** Oferta enxuta para selects e resolucao de nomes — com os angulos. */
export interface OfferOption {
  id: string;
  code: string;
  name: string;
  angles: { id: string; name: string }[];
}

/** Copy enxuta para o select de vinculo copy/criativo. */
export interface ScriptOption {
  id: string;
  code: string;
  title: string;
  offerId: string;
  currentVersion: number;
}

/**
 * Linha da listagem: criativo + nomes ja resolvidos no servidor.
 * O join e feito no server component (ofertas sao dezenas, cacheadas).
 */
export interface CreativeRow {
  creative: Creative;
  offerName: string;
  offerCode: string;
  angleName: string | null;
  editorName: string | null;
  scriptCode: string | null;
}

export interface CreativesPageData {
  rows: CreativeRow[];
  offers: OfferOption[];
  scripts: ScriptOption[];
  users: UserOption[];
  taxonomy: Taxonomy;
}
