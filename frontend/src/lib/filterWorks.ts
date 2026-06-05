import { ERAS } from "../constants/eras";
import { UNCREDITED_AUTHOR_VALUE } from "../store/catalogStore";
import type { DerivedCollection, Work } from "../types/work";
import type { FilterState } from "../store/filterStore";
import { buildItemsList, type Item } from "./buildItemsList";

function matchesArray<T>(selected: T[], value: T | undefined): boolean {
  if (selected.length === 0) return true;
  if (value === undefined) return false;
  return selected.includes(value);
}

function matchesSeries(selected: string[], series: string[] | undefined): boolean {
  if (selected.length === 0) return true;
  if (!series || series.length === 0) return false;
  return series.some((s) => selected.includes(s));
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
    ...(w.series ?? []),
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
    matchesSeries(filters.series, w.series) &&
    matchesArray(filters.publishers, w.publisher) &&
    matchesAuthorsOrUncredited(w, filters.authors) &&
    (searchActive || matchesDecadeOrUndated(w, filters.decades, filters.releaseUndated)) &&
    matchesQuery(w, filters.q),
  );
  const cmp = filters.sort === "release" ? compareRelease : compareChronology;
  return [...filtered].sort(cmp);
}

// ---------------------------------------------------------------------------
// filterAndSortItems — collection-aware filter + sort over Item[]
// ---------------------------------------------------------------------------

interface ItemsCtx {
  worksById: Map<string, Work>;
  ownedIds?: Set<string>;
  /** workId -> set of user-collection ids that contain it (built from the
   *  derived collections). Used by the collections facet in issues mode. */
  memberToCollections?: Map<string, Set<string>>;
}

function matchesItemAsWork(filters: FilterState, ctx: ItemsCtx, w: Work): boolean {
  // Ownership filtering is only active when signed in (ctx.ownedIds present).
  // Otherwise ignore it, so a stale store/URL value can't empty the catalog.
  const ownership = ctx.ownedIds ? (filters.ownership ?? "all") : "all";
  if (ownership !== "all") {
    const owned = ctx.ownedIds?.has(w.id) ?? false;
    if (ownership === "owned" && !owned) return false;
    if (ownership === "unowned" && owned) return false;
  }
  // In collections mode, only owned works appear as loose items. When signed
  // out (ownedIds undefined) no loose works show — collections mode is a
  // signed-in-only view of what you own.
  if (filters.items === "collections" && !(ctx.ownedIds?.has(w.id))) return false;
  const searchActive = filters.q.length > 0;
  return (
    (searchActive || matchesArray(filters.eras, w.era)) &&
    matchesArray(filters.mediums, w.medium) &&
    matchesSeries(filters.series, w.series) &&
    matchesArray(filters.publishers, w.publisher) &&
    matchesAuthorsOrUncredited(w, filters.authors) &&
    (filters.collections.length === 0 ||
      filters.collections.some((id) => ctx.memberToCollections?.get(w.id)?.has(id))) &&
    (searchActive || matchesDecadeOrUndated(w, filters.decades, filters.releaseUndated)) &&
    matchesQuery(w, filters.q)
  );
}

function matchesItemAsCollection(
  filters: FilterState,
  c: DerivedCollection,
  members: Work[],
): boolean {
  // A collection's works are owned by definition, so the collection itself is
  // "owned" — hide it when the ownership filter is set to "unowned".
  if (filters.ownership === "unowned") return false;
  // Era: OR over c.eras.
  if (filters.eras.length > 0 && !c.eras.some((e) => filters.eras.includes(e))) return false;
  // Medium: OR over c.mediums.
  if (filters.mediums.length > 0 && !c.mediums.some((m) => filters.mediums.includes(m))) return false;
  // Series / Authors / Publishers: ANY member matches.
  if (filters.series.length > 0 &&
      !members.some((m) => matchesSeries(filters.series, m.series))) return false;
  if (filters.authors.length > 0 &&
      !members.some((m) => matchesAuthorsOrUncredited(m, filters.authors))) return false;
  if (filters.publishers.length > 0 &&
      !members.some((m) => matchesArray(filters.publishers, m.publisher))) return false;
  // Collections facet: collection's own id is in the selection.
  if (filters.collections.length > 0 && !filters.collections.includes(c.id)) return false;
  // Decade: collection's own release_date.
  if ((filters.decades.length > 0 || filters.releaseUndated) &&
      !matchesDecadeOrUndated(
        { release_date: c.release_date } as Work,
        filters.decades,
        filters.releaseUndated,
      )) return false;
  // Query: collection title OR any member's matchable text.
  if (filters.q) {
    const q = filters.q.toLowerCase();
    if (!c.title.toLowerCase().includes(q) &&
        !members.some((m) => matchesQuery(m, filters.q))) return false;
  }
  return true;
}

function predicateForItem(filters: FilterState, ctx: ItemsCtx, item: Item): boolean {
  if (item.kind === "work") {
    return matchesItemAsWork(filters, ctx, item.work);
  }
  // Collection — aggregate via members.
  const members = item.collection.member_ids
    .map((id) => ctx.worksById.get(id))
    .filter((w): w is Work => w !== undefined);
  return matchesItemAsCollection(filters, item.collection, members);
}

function compareItemsChronology(a: Item, b: Item): number {
  const aEra = a.kind === "work" ? a.work.era : a.collection.anchor_era;
  const bEra = b.kind === "work" ? b.work.era : b.collection.anchor_era;
  // anchor_era may be "" for a collection with no resolvable members;
  // indexOf("") is -1, sorting such degenerate items first.
  return (ERAS as readonly string[]).indexOf(aEra) - (ERAS as readonly string[]).indexOf(bEra);
}

function compareItemsRelease(a: Item, b: Item): number {
  const ar = (a.kind === "work" ? a.work.release_date : a.collection.release_date) ?? "";
  const br = (b.kind === "work" ? b.work.release_date : b.collection.release_date) ?? "";
  if (ar && !br) return -1;
  if (!ar && br) return 1;
  if (ar < br) return -1;
  if (ar > br) return 1;
  return 0;
}

export function filterAndSortItems(
  works: Work[],
  collections: DerivedCollection[],
  filters: FilterState,
  ctx: ItemsCtx,
): Item[] {
  // workId -> set of user-collection ids containing it (for the collections
  // facet in issues mode, where membership lives on the collection, not the work).
  const memberToCollections = new Map<string, Set<string>>();
  for (const c of collections) {
    for (const wid of c.member_ids) {
      const set = memberToCollections.get(wid) ?? new Set<string>();
      set.add(c.id);
      memberToCollections.set(wid, set);
    }
  }
  const fullCtx: ItemsCtx = { ...ctx, memberToCollections };
  const list = buildItemsList(works, collections, filters.items);
  const filtered = list.filter((item) => predicateForItem(filters, fullCtx, item));
  const cmp = filters.sort === "release" ? compareItemsRelease : compareItemsChronology;
  return [...filtered].sort(cmp);
}
