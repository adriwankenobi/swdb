import type { EraIndex } from "../constants/eras";

export interface Work {
  id: string;
  era: EraIndex;
  title: string;
  medium: number;       // index into MEDIUMS
  year: number;         // signed in-universe year (negative = BBY)
  series?: string;
  number?: string;
  release_date?: string;
  authors?: string[];
  publisher?: string;
  cover_url?: string;
  wiki_url?: string;
}

export interface WorksFile {
  generated_at: string;
  works: Work[];
}
