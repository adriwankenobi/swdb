import { ERAS } from "../constants/eras";
import { UNCREDITED_AUTHOR_VALUE } from "../store/catalogStore";
import type { Work } from "../types/work";
import type { FilterState } from "../store/filterStore";

function matchesArray<T>(selected: T[], value: T | undefined): boolean {
  if (selected.length === 0) return true;
  if (value === undefined) return false;
  return selected.includes(value);
}

function matchesAuthorsOrUncredited(w: Work, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const noAuthors = !w.authors || w.authors.length === 0;
  // The "Uncredited" sentinel matches works that have no listed author.
  if (selected.includes(UNCREDITED_AUTHOR_VALUE) && noAuthors) return true;
  // Real author names match against w.authors as before.
  if (!noAuthors) {
    return w.authors!.some((a) => selected.includes(a));
  }
  return false;
}

function matchesQuery(w: Work, q: string): boolean {
  if (!q) return true;
  const haystack = [
    w.title,
    w.series ?? "",
    ...(w.authors ?? []),
  ].join(" ").toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function matchesDecadeOrUndated(
  w: Work,
  decades: number[],
  undatedOnly: boolean,
): boolean {
  // Neither filter active → accept all.
  if (decades.length === 0 && !undatedOnly) return true;
  // Union: a work passes if it falls in any selected decade
  // OR it has no release_date and "Unknown" is on.
  if (undatedOnly && w.release_date === undefined) return true;
  if (decades.length > 0 && w.release_date !== undefined) {
    const year = parseInt(w.release_date.slice(0, 4), 10);
    if (!Number.isNaN(year)) {
      const decade = Math.floor(year / 10) * 10;
      if (decades.includes(decade)) return true;
    }
  }
  return false;
}

// Sorts return 0 for equal keys so JS's stable Array.prototype.sort
// preserves the input order — which is the JSON / Excel order.
// Within an era, works are intentionally ordered by their position in the
// Excel workbook (the user's canonical chronology), not by the `year` field.
function compareChronology(a: Work, b: Work): number {
  return ERAS.indexOf(a.era) - ERAS.indexOf(b.era);
}

function compareRelease(a: Work, b: Work): number {
  const ar = a.release_date ?? "";
  const br = b.release_date ?? "";
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  if (ar < br) return -1;
  if (ar > br) return 1;
  return 0;
}

export function filterWorks(works: Work[], filters: FilterState): Work[] {
  const searchActive = filters.q.length > 0;
  const filtered = works.filter((w) =>
    (searchActive || matchesArray(filters.eras, w.era)) &&
    matchesArray(filters.mediums, w.medium) &&
    matchesArray(filters.series, w.series) &&
    matchesArray(filters.publishers, w.publisher) &&
    matchesAuthorsOrUncredited(w, filters.authors) &&
    (searchActive || matchesDecadeOrUndated(w, filters.decades, filters.releaseUndated)) &&
    matchesQuery(w, filters.q),
  );
  const cmp = filters.sort === "release" ? compareRelease : compareChronology;
  return [...filtered].sort(cmp);
}
