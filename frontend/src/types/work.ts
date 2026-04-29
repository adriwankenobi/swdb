import type { EraIndex } from "../constants/eras";

export interface Work {
  id: string;
  era: EraIndex;
  title: string;
  medium: number;       // index into MEDIUMS
  year: number;         // signed in-universe year (negative = BBY); start of the range
  year_end?: number;    // present only when the work spans a range of years
  series?: string;
  number?: string;
  release_date?: string;
  release_precision?: "day" | "month" | "year";
  authors?: string[];
  publisher?: string;
  cover_url?: string;
  wiki_url?: string;
}

export interface WorksFile {
  generated_at: string;
  works: Work[];
}
