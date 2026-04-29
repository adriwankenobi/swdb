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
  0: "#a23b3b", // Comic       — deep red
  1: "#c98a3c", // Junior Novel — amber
  2: "#2f5d8c", // Movie       — film blue
  3: "#5a4a36", // Novel       — book brown
  4: "#6b6b6b", // Short Story — neutral gray
  5: "#6a3b8a", // TV Show     — purple
  6: "#2f8a5e", // Videogame   — green
};
