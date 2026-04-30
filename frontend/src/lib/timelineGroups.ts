import { ERAS, type EraName } from "../constants/eras";
import type { Work } from "../types/work";

export interface ChronologyRow {
  year: number;
  year_end?: number;
  works: Work[];
}

export interface ChronologyGroup {
  eraName: EraName;
  rows: ChronologyRow[];
}

export interface ReleaseGroup {
  year: number | null;
  works: Work[];
}

export function groupForChronology(works: Work[]): ChronologyGroup[] {
  const eraMap = new Map<EraName, ChronologyRow[]>();

  for (const work of works) {
    if (!eraMap.has(work.era)) {
      eraMap.set(work.era, []);
    }
    const rows = eraMap.get(work.era)!;
    const last = rows[rows.length - 1];
    const sameSpan =
      last !== undefined &&
      last.year === work.year &&
      (last.year_end ?? last.year) === (work.year_end ?? work.year);
    if (sameSpan) {
      last.works.push(work);
    } else {
      const row: ChronologyRow = { year: work.year, works: [work] };
      if (work.year_end !== undefined) row.year_end = work.year_end;
      rows.push(row);
    }
  }

  const sortedEras = [...eraMap.keys()].sort(
    (a, b) => ERAS.indexOf(a) - ERAS.indexOf(b),
  );
  return sortedEras.map((eraName) => ({
    eraName,
    rows: eraMap.get(eraName)!,
  }));
}

export function groupForRelease(works: Work[]): ReleaseGroup[] {
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

  const sortedYears = [...yearMap.keys()].sort((a, b) => a - b);
  const result: ReleaseGroup[] = sortedYears.map((year) => ({
    year,
    works: yearMap.get(year)!,
  }));

  if (undated.length > 0) {
    result.push({ year: null, works: undated });
  }

  return result;
}
