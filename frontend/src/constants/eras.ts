export const ERAS = [
  "PRE-REPUBLIC",
  "OLD REPUBLIC",
  "RISE OF THE EMPIRE",
  "THE CLONE WARS",
  "THE DARK TIMES",
  "REBELLION",
  "NEW REPUBLIC",
  "NEW JEDI ORDER",
  "LEGACY",
  "NON-CANON",
] as const;

export type EraIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const ERA_COLORS: Record<EraIndex, string> = {
  0: "#5b6770",
  1: "#7a4ea3",
  2: "#2f5d8c",
  3: "#c44a3a",
  4: "#3a3a3a",
  5: "#b8862f",
  6: "#2f8a5e",
  7: "#0d4a6e",
  8: "#7a2238",
  9: "#888888",
};
