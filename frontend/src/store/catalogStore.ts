import { create } from "zustand";
import { MEDIUMS, type MediumName } from "../constants/mediums";
import type { Work, WorksFile } from "../types/work";

export interface Facet<V = string> {
  value: V;
  label: string;
  count: number;
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
    mediums: Facet<MediumName>[];
  };
  load: (url: string) => Promise<void>;
}

const empty: CatalogState["facets"] = {
  series: [],
  authors: [],
  publishers: [],
  mediums: [],
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
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ value: label, label, count }));
  };
  const mediumCounts = new Map<MediumName, number>();
  for (const w of works) {
    mediumCounts.set(w.medium, (mediumCounts.get(w.medium) ?? 0) + 1);
  }
  const mediums: Facet<MediumName>[] = [...mediumCounts.entries()]
    .sort(
      (a, b) => MEDIUMS.indexOf(a[0]) - MEDIUMS.indexOf(b[0]),
    )
    .map(([name, count]) => ({ value: name, label: name, count }));
  return {
    series: counts((w) => w.series),
    authors: counts((w) => w.authors),
    publishers: counts((w) => w.publisher),
    mediums,
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
