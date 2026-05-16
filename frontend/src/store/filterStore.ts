import { create } from "zustand";
import type { EraName } from "../constants/eras";
import type { MediumName } from "../constants/mediums";

export type ViewMode = "cards" | "table" | "timeline";
export type SortMode = "chronology" | "release";
export type ItemsMode = "issues" | "collections";

export interface FilterState {
  eras: EraName[];
  mediums: MediumName[];
  decades: number[];
  series: string[];
  authors: string[];
  publishers: string[];
  collections: string[];
  q: string;
  releaseUndated: boolean;
  view: ViewMode;
  sort: SortMode;
  items: ItemsMode;
  openWorkId: string | null;
  openCollectionId: string | null;
}

const defaultState: FilterState = {
  eras: [],
  mediums: [],
  decades: [],
  series: [],
  authors: [],
  publishers: [],
  collections: [],
  q: "",
  releaseUndated: false,
  view: "cards",
  sort: "chronology",
  items: "issues",
  openWorkId: null,
  openCollectionId: null,
};

interface FilterActions {
  set: (patch: Partial<FilterState>) => void;
  toggleArrayValue: <
    K extends "eras" | "mediums" | "decades" | "series" | "authors" | "publishers" | "collections",
  >(
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
