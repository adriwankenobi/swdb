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
  0: "#e64545", // Comic        — bright red
  1: "#f29a3c", // Junior Novel — warm orange
  2: "#3aa6c2", // Movie        — teal/cyan (clearly different from era blues)
  3: "#9b6b3a", // Novel        — book tan
  4: "#a8a8a8", // Short Story  — light gray
  5: "#c659a0", // TV Show      — magenta
  6: "#6cc24a", // Videogame    — lime green
};
