import { ERAS, type EraName } from "../constants/eras";
import { MEDIUMS, type MediumName } from "../constants/mediums";
import { slugify } from "./slug";
import type { FilterState, ViewMode, SortMode, ItemsMode } from "../store/filterStore";

const csv = (arr: string[]): string | undefined =>
  arr.length === 0 ? undefined : arr.join(",");

const parseCsv = (raw: string | null): string[] =>
  raw ? raw.split(",").filter(Boolean) : [];

const VIEWS: ViewMode[] = ["cards", "table", "timeline"];
const SORTS: SortMode[] = ["chronology", "release"];
const ITEMS: ItemsMode[] = ["issues", "collections"];

// Reverse maps: slug → canonical name. Built once at module load.
const ERA_BY_SLUG: Map<string, EraName> = new Map(
  ERAS.map((era) => [slugify(era), era]),
);
const MEDIUM_BY_SLUG: Map<string, MediumName> = new Map(
  MEDIUMS.map((medium) => [slugify(medium), medium]),
);

function readEraSlugs(raw: string | null): EraName[] {
  return parseCsv(raw)
    .map((slug) => ERA_BY_SLUG.get(slug))
    .filter((era): era is EraName => era !== undefined);
}

function readMediumSlugs(raw: string | null): MediumName[] {
  return parseCsv(raw)
    .map((slug) => MEDIUM_BY_SLUG.get(slug))
    .filter((medium): medium is MediumName => medium !== undefined);
}

function readDecades(raw: string | null): number[] {
  return parseCsv(raw)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
}

export function readFromUrl(search: string): Partial<FilterState> {
  const p = new URLSearchParams(search);
  const view = p.get("view");
  const sort = p.get("sort");
  const items = p.get("items");
  const work = p.get("work");
  const collection = p.get("collection");
  return {
    eras: readEraSlugs(p.get("era")),
    mediums: readMediumSlugs(p.get("medium")),
    decades: readDecades(p.get("decade")),
    series: parseCsv(p.get("series")),
    authors: parseCsv(p.get("author")),
    publishers: parseCsv(p.get("publisher")),
    collections: parseCsv(p.get("coll")),
    q: p.get("q") ?? "",
    releaseUndated: p.get("release_undated") === "1",
    view: VIEWS.includes(view as ViewMode) ? (view as ViewMode) : "cards",
    sort: SORTS.includes(sort as SortMode) ? (sort as SortMode) : "chronology",
    items: ITEMS.includes(items as ItemsMode) ? (items as ItemsMode) : "issues",
    openWorkId: work,
    openCollectionId: work ? null : collection,
  };
}

export function writeToUrl(state: FilterState): string {
  const p = new URLSearchParams();
  const era = csv(state.eras.map((e) => slugify(e)));
  const medium = csv(state.mediums.map((m) => slugify(m)));
  const decade = csv(state.decades.map((d) => String(d)));
  const series = csv(state.series);
  const author = csv(state.authors);
  const publisher = csv(state.publishers);
  const coll = csv(state.collections);
  if (era) p.set("era", era);
  if (medium) p.set("medium", medium);
  if (decade) p.set("decade", decade);
  if (series) p.set("series", series);
  if (author) p.set("author", author);
  if (publisher) p.set("publisher", publisher);
  if (coll) p.set("coll", coll);
  if (state.q) p.set("q", state.q);
  if (state.releaseUndated) p.set("release_undated", "1");
  if (state.view !== "cards") p.set("view", state.view);
  if (state.sort !== "chronology") p.set("sort", state.sort);
  if (state.items !== "issues") p.set("items", state.items);
  if (state.openWorkId) p.set("work", state.openWorkId);
  else if (state.openCollectionId) p.set("collection", state.openCollectionId);
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}
