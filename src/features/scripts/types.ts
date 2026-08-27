import type { Script } from "@/types/domain";

export interface UserOption {
  id: string;
  name: string;
}

export interface OfferOption {
  id: string;
  code: string;
  name: string;
  angles: { id: string; name: string }[];
}

/** Linha da listagem: copy + nomes resolvidos no servidor. */
export interface ScriptRow {
  script: Script;
  offerName: string;
  offerCode: string;
  angleName: string | null;
  responsibleName: string | null;
}
