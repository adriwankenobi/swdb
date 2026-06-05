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
}

/** A user-created collection as stored in Supabase (raw, no derived fields). */
export interface UserCollection {
  id: string;
  title: string;
  number?: number; // user-set; shown in the table "#" column
  info_url?: string;
  cover_url?: string;
  member_ids: string[]; // work ids in reading order
}

/** A user collection with display/sort fields derived from its member works. */
export interface DerivedCollection {
  id: string;
  title: string;
  number?: number; // user-set; shown in the table "#" column
  info_url?: string;
  cover_url?: string;
  member_ids: string[];
  eras: EraName[];
  mediums: MediumName[];
  series: string[]; // union of member series (deduped)
  authors: string[]; // union of member authors (deduped)
  publishers: string[]; // union of member publishers (deduped)
  year: number;
  year_end?: number;
  anchor_era: EraName | ""; // era of the earliest-year member ("" when no members)
  release_date?: string;
  release_precision?: Work["release_precision"];
}

export interface WorksFile {
  generated_at: string;
  works: Work[];
}
