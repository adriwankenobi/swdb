import { ERAS } from "../constants/eras";
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

function matchesDecade(w: Work, decades: number[]): boolean {
  if (decades.length === 0) return true;
  if (!w.release_date) return false;
  const year = parseInt(w.release_date.slice(0, 4), 10);
  if (Number.isNaN(year)) return false;
  const decade = Math.floor(year / 10) * 10;
  return decades.includes(decade);
}

function matchesReleaseUndated(w: Work, undatedOnly: boolean): boolean {
  if (!undatedOnly) return true;
  return w.release_date === undefined;
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
    matchesAnyOf(filters.authors, w.authors) &&
    (searchActive || matchesDecade(w, filters.decades)) &&
    (searchActive || matchesReleaseUndated(w, filters.releaseUndated)) &&
    matchesQuery(w, filters.q),
  );
  const cmp = filters.sort === "release" ? compareRelease : compareChronology;
  return [...filtered].sort(cmp);
}
