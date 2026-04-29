import { create } from "zustand";
import { MEDIUMS } from "../constants/mediums";
import type { Work, WorksFile } from "../types/work";

export interface Facet<V = string> {
  value: V;      // canonical (used by filterStore)
  label: string; // display
  count: number; // works that have this value
}

interface CatalogState {
  status: "idle" | "loading" | "ready" | "error";
  works: Work[];
  generatedAt: string | null;
  error: string | null;
  facets: {
    series: Facet[];
    authors: Facet[];
    publishers: Facet[];
    mediums: Facet<number>[];
    yearMin: number;
    yearMax: number;
  };
  load: (url: string) => Promise<void>;
}

const empty: CatalogState["facets"] = {
  series: [],
  authors: [],
  publishers: [],
  mediums: [],
  yearMin: 0,
  yearMax: 0,
};

function buildFacets(works: Work[]): CatalogState["facets"] {
  const counts = (key: (w: Work) => string[] | string | undefined): Facet[] => {
    const map = new Map<string, number>();
    for (const w of works) {
      const raw = key(w);
      const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const v of values) {
        map.set(v, (map.get(v) ?? 0) + 1);
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ value: label, label, count }));
  };
  const mediumCounts = new Map<number, number>();
  for (const w of works) {
    mediumCounts.set(w.medium, (mediumCounts.get(w.medium) ?? 0) + 1);
  }
  const mediums: Facet<number>[] = [...mediumCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, count]) => ({ value: idx, label: MEDIUMS[idx], count }));
  const years = works.map((w) => w.year);
  return {
    series: counts((w) => w.series),
    authors: counts((w) => w.authors),
    publishers: counts((w) => w.publisher),
    mediums,
    yearMin: years.length ? Math.min(...years) : 0,
    yearMax: years.length ? Math.max(...years) : 0,
  };
}

export const useCatalogStore = create<CatalogState>((set) => ({
  status: "idle",
  works: [],
  generatedAt: null,
  error: null,
  facets: empty,
  load: async (url: string) => {
    set({ status: "loading" });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as WorksFile;
      set({
        status: "ready",
        works: data.works,
        generatedAt: data.generated_at,
        facets: buildFacets(data.works),
      });
    } catch (err) {
      set({ status: "error", error: (err as Error).message });
    }
  },
}));
