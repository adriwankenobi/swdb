import type { EraName } from "../constants/eras";
import type { MediumName } from "../constants/mediums";

export interface Work {
  id: string;
  era: EraName;
  title: string;
  medium: MediumName;
  year: number;
  year_end?: number;
  series?: string[];
  number?: string[];
  release_date?: string;
  release_precision?: "day" | "month" | "year";
  authors?: string[];
  publisher?: string;
  cover_url?: string;
  wiki_url?: string;
  color?: string;
  collection_ids?: string[];
}

export interface Collection {
  id: string;
  title: string;
  eras: EraName[];
  mediums: MediumName[];
  year: number;          // full-range min across all members
  year_end?: number;     // full-range max, omitted when equal to year
  anchor_year: number;   // min year over dominant-medium members
  anchor_era: EraName;   // timeline band: era of the anchor member
  anchor_member_id: string;  // work id of the anchor member
  release_date?: string;
  release_precision?: "day" | "month" | "year";
  cover_url?: string;
  wiki_url?: string;
  color?: string;
  member_ids: string[];
}

export interface WorksFile {
  generated_at: string;
  works: Work[];
  collections: Collection[];
}
