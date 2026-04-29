import { create } from "zustand";

export type ViewMode = "cards" | "table" | "timeline";
export type SortMode = "chronology" | "release";

export interface FilterState {
  eras: number[];          // era indices
  mediums: number[];       // indices into MEDIUMS (e.g. 4 = Novel)
  series: string[];        // canonical series strings
  authors: string[];
  publishers: string[];
  q: string;
  yearMin: number | null;  // null = unset
  yearMax: number | null;
  releaseMin: string | null; // ISO date string or null
  releaseMax: string | null; // ISO date string or null
  releaseUndated: boolean;   // when true, only works WITHOUT release_date pass
  view: ViewMode;
  sort: SortMode;
  openWorkId: string | null;
}

const defaultState: FilterState = {
  eras: [],
  mediums: [],
  series: [],
  authors: [],
  publishers: [],
  q: "",
  yearMin: null,
  yearMax: null,
  releaseMin: null,
  releaseMax: null,
  releaseUndated: false,
  view: "cards",
  sort: "chronology",
  openWorkId: null,
};

interface FilterActions {
  set: (patch: Partial<FilterState>) => void;
  toggleArrayValue: <K extends "eras" | "mediums" | "series" | "authors" | "publishers">(
    key: K,
    value: FilterState[K][number],
  ) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  ...defaultState,
  set: (patch) => set(patch),
  toggleArrayValue: (key, value) => {
    const current = get()[key] as readonly (string | number)[];
    const next = current.includes(value as never)
      ? current.filter((v) => v !== value)
      : [...current, value];
    set({ [key]: next } as Partial<FilterState>);
  },
  clearAll: () => set({ ...defaultState, view: get().view, sort: get().sort }),
}));
