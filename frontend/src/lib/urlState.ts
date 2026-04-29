import type { FilterState, ViewMode, SortMode } from "../store/filterStore";

const csv = (arr: (string | number)[]): string | undefined =>
  arr.length === 0 ? undefined : arr.join(",");

const parseCsv = (raw: string | null): string[] =>
  raw ? raw.split(",").filter(Boolean) : [];

const parseInts = (raw: string | null): number[] =>
  parseCsv(raw).map((s) => Number(s)).filter((n) => Number.isFinite(n));

const parseInt1 = (raw: string | null): number | null => {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const VIEWS: ViewMode[] = ["cards", "table", "timeline"];
const SORTS: SortMode[] = ["chronology", "release"];

export function readFromUrl(search: string): Partial<FilterState> {
  const p = new URLSearchParams(search);
  const view = p.get("view");
  const sort = p.get("sort");
  return {
    eras: parseInts(p.get("era")),
    mediums: parseInts(p.get("medium")),
    series: parseCsv(p.get("series")),
    authors: parseCsv(p.get("author")),
    publishers: parseCsv(p.get("publisher")),
    q: p.get("q") ?? "",
    yearMin: parseInt1(p.get("year_min")),
    yearMax: parseInt1(p.get("year_max")),
    releaseMin: p.get("release_min"),
    releaseMax: p.get("release_max"),
    view: VIEWS.includes(view as ViewMode) ? (view as ViewMode) : "cards",
    sort: SORTS.includes(sort as SortMode) ? (sort as SortMode) : "chronology",
    openWorkId: p.get("work"),
  };
}

export function writeToUrl(state: FilterState): string {
  const p = new URLSearchParams();
  const era = csv(state.eras);
  const medium = csv(state.mediums);
  const series = csv(state.series);
  const author = csv(state.authors);
  const publisher = csv(state.publishers);
  if (era) p.set("era", era);
  if (medium) p.set("medium", medium);
  if (series) p.set("series", series);
  if (author) p.set("author", author);
  if (publisher) p.set("publisher", publisher);
  if (state.q) p.set("q", state.q);
  if (state.yearMin !== null) p.set("year_min", String(state.yearMin));
  if (state.yearMax !== null) p.set("year_max", String(state.yearMax));
  if (state.releaseMin !== null) p.set("release_min", state.releaseMin);
  if (state.releaseMax !== null) p.set("release_max", state.releaseMax);
  if (state.view !== "cards") p.set("view", state.view);
  if (state.sort !== "chronology") p.set("sort", state.sort);
  if (state.openWorkId) p.set("work", state.openWorkId);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
