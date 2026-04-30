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

export type EraName = (typeof ERAS)[number];

export const ERA_COLORS: Record<EraName, string> = {
  "PRE-REPUBLIC":       "#5b6770",
  "OLD REPUBLIC":       "#7a4ea3",
  "RISE OF THE EMPIRE": "#2f5d8c",
  "THE CLONE WARS":     "#c44a3a",
  "THE DARK TIMES":     "#3a3a3a",
  "REBELLION":          "#b8862f",
  "NEW REPUBLIC":       "#2f8a5e",
  "NEW JEDI ORDER":     "#0d4a6e",
  "LEGACY":             "#7a2238",
  "NON-CANON":          "#888888",
};
