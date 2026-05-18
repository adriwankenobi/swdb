import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalogStore } from "./store/catalogStore";
import { useFilterStore } from "./store/filterStore";
import { readFromUrl, writeToUrl } from "./lib/urlState";
import { slugify } from "./lib/slug";
import { AppShell } from "./components/layout/AppShell";
import { Landing } from "./components/layout/Landing";
import { filterAndSortItems } from "./lib/filterWorks";
import { ActiveFilterChips } from "./components/filters/ActiveFilterChips";
import { CardGrid } from "./components/views/CardGrid";
import { TableView } from "./components/views/TableView";
import { TimelineView } from "./components/views/TimelineView";
import { WorkDetailModal } from "./components/work/WorkDetailModal";
import { CollectionDetailModal } from "./components/work/CollectionDetailModal";
import type { EraName } from "./constants/eras";

export default function App() {
  const { status, works, collections: catalogCollections, worksById, error, load } = useCatalogStore();

  // Subscribe to each field used by writeToUrl with its own selector.
  const eras = useFilterStore((s) => s.eras);
  const mediums = useFilterStore((s) => s.mediums);
  const series = useFilterStore((s) => s.series);
  const authors = useFilterStore((s) => s.authors);
  const publishers = useFilterStore((s) => s.publishers);
  const collections = useFilterStore((s) => s.collections);
  const q = useFilterStore((s) => s.q);
  const decades = useFilterStore((s) => s.decades);
  const releaseUndated = useFilterStore((s) => s.releaseUndated);
  const view = useFilterStore((s) => s.view);
  const sort = useFilterStore((s) => s.sort);
  const items = useFilterStore((s) => s.items);
  const openWorkId = useFilterStore((s) => s.openWorkId);
  const openCollectionId = useFilterStore((s) => s.openCollectionId);
  const set = useFilterStore((s) => s.set);
  const clearAll = useFilterStore((s) => s.clearAll);

  // Bundle fields into a stable object for filterAndSortItems and writeToUrl.
  const filterState = useMemo(
    () => ({
      eras, mediums, decades, series, authors, publishers, collections,
      q, releaseUndated, view, sort, items, openWorkId, openCollectionId,
    }),
    [
      eras, mediums, decades, series, authors, publishers, collections,
      q, releaseUndated, view, sort, items, openWorkId, openCollectionId,
    ],
  );

  const collectionsBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catalogCollections) {
      const slug = slugify(c.title);
      // first-wins: if two collections slug-collide, keep the first one
      if (!m.has(slug)) m.set(slug, c.id);
    }
    return m;
  }, [catalogCollections]);

  const collectionsById = useCatalogStore((cs) => cs.collectionsById);

  const didHydrateCollections = useRef(false);

  // Show landing on fresh visit (no query params), stay in catalog if URL has filters
  const [showLanding, setShowLanding] = useState<boolean>(
    () => window.location.search === ""
  );

  useEffect(() => {
    set(readFromUrl(window.location.search));
    load(`${import.meta.env.BASE_URL}data/works.json`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "ready" || didHydrateCollections.current) return;
    didHydrateCollections.current = true;
    const fromUrl = readFromUrl(window.location.search, collectionsBySlug);
    if (fromUrl.collections && fromUrl.collections.length > 0) {
      set({ collections: fromUrl.collections });
    }
  }, [status, collectionsBySlug, set]);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = writeToUrl({
        eras, mediums, decades, series, authors, publishers, collections,
        q, releaseUndated,
        view, sort, items, openWorkId, openCollectionId,
      }, collectionsById);
      const target = `${window.location.pathname}${next}`;
      if (target !== window.location.pathname + window.location.search) {
        window.history.replaceState({}, "", target);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [
    eras, mediums, decades, series, authors, publishers, collections,
    q, releaseUndated, view, sort, items, openWorkId, openCollectionId,
    collectionsById,
  ]);

  if (status === "loading" || status === "idle") return <p className="p-4">Loading…</p>;
  if (status === "error") return <p className="p-4 text-red-600">Failed to load: {error}</p>;

  if (showLanding) {
    return (
      <Landing
        onPick={(_era: EraName) => setShowLanding(false)}
        onBrowseAll={() => setShowLanding(false)}
      />
    );
  }

  function handleHome() {
    clearAll();
    setShowLanding(true);
  }

  const visible = filterAndSortItems(works, catalogCollections, filterState, { worksById });

  return (
    <>
      <AppShell onHome={handleHome}>
        <div className="flex h-full flex-col">
          <ActiveFilterChips />
          {view === "cards" && <CardGrid items={visible} />}
          {view === "table" && <TableView items={visible} />}
          {view === "timeline" && <TimelineView items={visible} />}
        </div>
      </AppShell>
      <WorkDetailModal visibleItems={visible} />
      <CollectionDetailModal visibleItems={visible} />
    </>
  );
}
