import type { Offer } from "@/types/domain";

/** Opcao de responsavel nos formularios. */
export interface UserOption {
  id: string;
  name: string;
}

/** Numeros de hoje, ja derivados no servidor. */
export interface TodaySnapshot {
  spend: number;
  revenue: number;
  roas: number | null;
  profit: number;
  sales: number;
}

/**
 * Linha da listagem: a oferta mais o que a tela precisa mostrar ao lado
 * dela. O join com usuarios e metricas acontece no server component, de
 * modo que o componente cliente recebe tudo pronto.
 */
export interface OfferCounts {
  creatives: number;
  copies: number;
  chips: number;
}

export interface OfferRow {
  offer: Offer;
  responsibleName: string | null;
  today: TodaySnapshot;
  counts: OfferCounts;
}
