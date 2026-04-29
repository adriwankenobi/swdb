import type { Work } from "../types/work";

export interface ChronologyRow {
  year: number;
  year_end?: number;
  works: Work[];
}

export interface ChronologyGroup {
  eraIndex: number;
  rows: ChronologyRow[];
}

export interface ReleaseGroup {
  year: number | null; // null = "undated" bucket
  works: Work[];
}

// Walk works in input (= JSON / Excel) order. Within each era, coalesce a run
// of consecutive works that share the same year span into a single row. The
// row order itself follows Excel position, not year value — so the timeline's
// chronology mirrors the user's canonical ordering in the workbook.
export function groupForChronology(works: Work[]): ChronologyGroup[] {
  const eraMap = new Map<number, ChronologyRow[]>();

  for (const work of works) {
    const era = work.era as number;
    if (!eraMap.has(era)) {
      eraMap.set(era, []);
    }
    const rows = eraMap.get(era)!;
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

  const sortedEras = [...eraMap.keys()].sort((a, b) => a - b);
  return sortedEras.map((eraIndex) => ({
    eraIndex,
    rows: eraMap.get(eraIndex)!,
  }));
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
