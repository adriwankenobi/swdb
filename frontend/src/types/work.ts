import type { EraName } from "../constants/eras";
import type { MediumName } from "../constants/mediums";

export interface Work {
  id: string;
  era: EraName;
  title: string;
  medium: MediumName;
  year: number;
  year_end?: number;
  series?: string;
  number?: string;
  release_date?: string;
  release_precision?: "day" | "month" | "year";
  authors?: string[];
  publisher?: string;
  cover_url?: string;
  wiki_url?: string;
  color?: string;
}

export interface WorksFile {
  generated_at: string;
  works: Work[];
}
