import type { Work } from "../types/work";

export interface ChronologyGroup {
  eraIndex: number;
  years: { year: number; works: Work[] }[];
}

export interface ReleaseGroup {
  year: number | null; // null = "undated" bucket
  works: Work[];
}

// Stable: relies on input order (= JSON / Excel order) within each bucket.
export function groupForChronology(works: Work[]): ChronologyGroup[] {
  // Map: eraIndex -> Map<year, Work[]>
  const eraMap = new Map<number, Map<number, Work[]>>();

  for (const work of works) {
    const era = work.era as number;
    if (!eraMap.has(era)) {
      eraMap.set(era, new Map<number, Work[]>());
    }
    const yearMap = eraMap.get(era)!;
    if (!yearMap.has(work.year)) {
      yearMap.set(work.year, []);
    }
    yearMap.get(work.year)!.push(work);
  }

  // Sort era groups by eraIndex ascending
  const sortedEras = [...eraMap.keys()].sort((a, b) => a - b);

  return sortedEras.map((eraIndex) => {
    const yearMap = eraMap.get(eraIndex)!;
    // Sort year groups ascending
    const sortedYears = [...yearMap.keys()].sort((a, b) => a - b);
    return {
      eraIndex,
      years: sortedYears.map((year) => ({
        year,
        works: yearMap.get(year)!,
      })),
    };
  });
}

export function groupForRelease(works: Work[]): ReleaseGroup[] {
  // Map: year (number) -> Work[]; null bucket is tracked separately
  const yearMap = new Map<number, Work[]>();
  const undated: Work[] = [];

  for (const work of works) {
    if (work.release_date) {
      const parsed = parseInt(work.release_date.slice(0, 4), 10);
      if (!Number.isNaN(parsed)) {
        if (!yearMap.has(parsed)) {
          yearMap.set(parsed, []);
        }
        yearMap.get(parsed)!.push(work);
        continue;
      }
    }
    undated.push(work);
  }

  // Sort ascending by year
  const sortedYears = [...yearMap.keys()].sort((a, b) => a - b);
  const result: ReleaseGroup[] = sortedYears.map((year) => ({
    year,
    works: yearMap.get(year)!,
  }));

  // Append null bucket last if non-empty
  if (undated.length > 0) {
    result.push({ year: null, works: undated });
  }

  return result;
}
