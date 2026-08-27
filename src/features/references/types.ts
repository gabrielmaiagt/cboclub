import type { CreativeReference } from "@/types/domain";

export interface MiningOption {
  id: string;
  code: string;
  name: string;
}

export interface ReferenceRow {
  reference: CreativeReference;
  miningName: string | null;
}
