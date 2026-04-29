export const MEDIUMS = [
  "Comic",        // 0
  "Junior Novel", // 1
  "Movie",        // 2
  "Novel",        // 3
  "Short Story",  // 4
  "TV Show",      // 5
  "Videogame",    // 6
] as const;

export type MediumIndex = number;

export const MEDIUM_COLORS: Record<number, string> = {
  0: "#c83a3a", // Comic        — strong red
  1: "#d97c1a", // Junior Novel — burnt orange
  2: "#1f8aaa", // Movie        — deep teal
  3: "#7a5836", // Novel        — book tan-brown
  4: "#5e5e5e", // Short Story  — neutral mid-gray
  5: "#a14687", // TV Show      — magenta
  6: "#3fa845", // Videogame    — bright green
};
