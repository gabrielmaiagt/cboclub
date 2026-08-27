import type { Chip } from "@/types/domain";

export interface UserOption {
  id: string;
  name: string;
}

export interface OfferOption {
  id: string;
  code: string;
  name: string;
}

export interface ChipRow {
  chip: Chip;
  responsibleName: string | null;
  offerName: string | null;
  offerCode: string | null;
}
