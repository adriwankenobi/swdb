import type { Work } from "../types/work";
import type { FilterState } from "../store/filterStore";

function matchesArray<T>(selected: T[], value: T | undefined): boolean {
  if (selected.length === 0) return true;
  if (value === undefined) return false;
  return selected.includes(value);
}

function matchesAnyOf<T>(selected: T[], values: T[] | undefined): boolean {
  if (selected.length === 0) return true;
  if (!values || values.length === 0) return false;
  return values.some((v) => selected.includes(v));
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

function matchesYear(w: Work, min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  const y = w.year;
  if (min !== null && y < min) return false;
  if (max !== null && y > max) return false;
  return true;
}

function matchesRelease(w: Work, min: string | null, max: string | null): boolean {
  if (min === null && max === null) return true;
  const d = w.release_date;
  if (!d) return false; // no release_date → excluded when filter is active
  if (min !== null && d < min) return false;
  if (max !== null && d > max) return false;
  return true;
}

// Sorts return 0 for equal keys so JS's stable Array.prototype.sort
// preserves the input order — which is the JSON / Excel order.
function compareChronology(a: Work, b: Work): number {
  if (a.era !== b.era) return a.era - b.era;
  return a.year - b.year;
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
    matchesAnyOf(filters.authors, w.authors) &&
    matchesYear(w, filters.yearMin, filters.yearMax) &&
    (searchActive || matchesRelease(w, filters.releaseMin, filters.releaseMax)) &&
    matchesQuery(w, filters.q),
  );
  const cmp = filters.sort === "release" ? compareRelease : compareChronology;
  return [...filtered].sort(cmp);
}
