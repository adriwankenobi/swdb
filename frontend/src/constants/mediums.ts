export const MEDIUMS = [
  "Comic",
  "Junior Novel",
  "Movie",
  "Novel",
  "Short Story",
  "TV Show",
  "Videogame",
] as const;

export type MediumName = (typeof MEDIUMS)[number];

export const MEDIUM_COLORS: Record<MediumName, string> = {
  "Comic":        "#c83a3a",
  "Junior Novel": "#d97c1a",
  "Movie":        "#1f8aaa",
  "Novel":        "#7a5836",
  "Short Story":  "#5e5e5e",
  "TV Show":      "#a14687",
  "Videogame":    "#3fa845",
};
