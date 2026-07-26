import { ERAS, type EraName } from "../constants/eras";
import type { Item } from "./buildItemsList";

// ---------------------------------------------------------------------------
// Accessor helpers — abstract over work vs collection items.
// ---------------------------------------------------------------------------

function eraOf(item: Item): EraName {
  // A user collection's anchor_era is a real EraName except for the degenerate
  // case of zero resolvable members ("" — does not occur in practice).
  return (item.kind === "work" ? item.work.era : item.collection.anchor_era) as EraName;
}

// undefined for NON-CANON items, which have no in-universe year.
function yearOf(item: Item): number | undefined {
  return item.kind === "work" ? item.work.year : item.collection.year;
}

function yearEndOf(item: Item): number | undefined {
  return item.kind === "work" ? item.work.year_end : item.collection.year_end;
}

function releaseDateOf(item: Item): string | undefined {
  return item.kind === "work" ? item.work.release_date : item.collection.release_date;
}

// ---------------------------------------------------------------------------
// Chronology grouping
// ---------------------------------------------------------------------------

export interface ChronologyRow {
  year?: number; // undefined → the row's year label is left blank (NON-CANON)
  year_end?: number;
  items: Item[];
}

export interface ChronologyGroup {
  era: EraName;
  rows: ChronologyRow[];
}

// Walk items in input (= JSON / Excel) order. Within each era, coalesce a run
// of consecutive items that share the same year span into a single row. The
// row order itself follows Excel position, not year value — so the timeline's
// chronology mirrors the user's canonical ordering in the workbook.
export function groupForChronology(items: Item[]): ChronologyGroup[] {
  const eraMap = new Map<EraName, ChronologyRow[]>();

  for (const item of items) {
    const era = eraOf(item);
    if (!eraMap.has(era)) {
      eraMap.set(era, []);
    }
    const rows = eraMap.get(era)!;
    const last = rows[rows.length - 1];
    const year = yearOf(item);
    const end = yearEndOf(item);
    const sameSpan =
      last !== undefined &&
      last.year === year &&
      (last.year_end ?? last.year) === (end ?? year);
    if (sameSpan) {
      last.items.push(item);
    } else {
      const row: ChronologyRow = { year, items: [item] };
      if (end !== undefined) row.year_end = end;
      rows.push(row);
    }
  }

  const sortedEras = [...eraMap.keys()].sort(
    (a, b) => ERAS.indexOf(a) - ERAS.indexOf(b),
  );
  return sortedEras.map((eraName) => ({
    era: eraName,
    rows: eraMap.get(eraName)!,
  }));
}

// ---------------------------------------------------------------------------
// Release grouping
// ---------------------------------------------------------------------------

export interface ReleaseGroup {
  year: number | null;
  items: Item[];
}

export function groupForRelease(items: Item[]): ReleaseGroup[] {
  const yearMap = new Map<number, Item[]>();
  const undated: Item[] = [];

  for (const item of items) {
    const rd = releaseDateOf(item);
    if (rd) {
      const parsed = parseInt(rd.slice(0, 4), 10);
      if (!Number.isNaN(parsed)) {
        if (!yearMap.has(parsed)) {
          yearMap.set(parsed, []);
        }
        yearMap.get(parsed)!.push(item);
        continue;
      }
    }
    undated.push(item);
  }

  const sortedYears = [...yearMap.keys()].sort((a, b) => a - b);
  const result: ReleaseGroup[] = sortedYears.map((year) => ({
    year,
    items: yearMap.get(year)!,
  }));

  if (undated.length > 0) {
    result.push({ year: null, items: undated });
  }

  return result;
}
