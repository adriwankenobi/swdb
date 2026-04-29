import { useEffect, useMemo, useState } from "react";
import { useCatalogStore } from "./store/catalogStore";
import { useFilterStore } from "./store/filterStore";
import { readFromUrl, writeToUrl } from "./lib/urlState";
import { AppShell } from "./components/layout/AppShell";
import { Landing } from "./components/layout/Landing";
import { filterWorks } from "./lib/filterWorks";
import { ActiveFilterChips } from "./components/filters/ActiveFilterChips";
import { CardGrid } from "./components/views/CardGrid";
import { TableView } from "./components/views/TableView";
import { TimelineView } from "./components/views/TimelineView";
import { WorkDetailModal } from "./components/work/WorkDetailModal";
import type { EraIndex } from "./constants/eras";

export default function App() {
  const { status, works, error, load } = useCatalogStore();

  // Subscribe to each field used by writeToUrl with its own selector.
  const eras = useFilterStore((s) => s.eras);
  const mediums = useFilterStore((s) => s.mediums);
  const series = useFilterStore((s) => s.series);
  const authors = useFilterStore((s) => s.authors);
  const publishers = useFilterStore((s) => s.publishers);
  const q = useFilterStore((s) => s.q);
  const yearMin = useFilterStore((s) => s.yearMin);
  const yearMax = useFilterStore((s) => s.yearMax);
  const releaseMin = useFilterStore((s) => s.releaseMin);
  const releaseMax = useFilterStore((s) => s.releaseMax);
  const releaseUndated = useFilterStore((s) => s.releaseUndated);
  const view = useFilterStore((s) => s.view);
  const sort = useFilterStore((s) => s.sort);
  const openWorkId = useFilterStore((s) => s.openWorkId);
  const set = useFilterStore((s) => s.set);
  const clearAll = useFilterStore((s) => s.clearAll);

  // Bundle fields into a stable object for filterWorks and writeToUrl.
  const filterState = useMemo(
    () => ({ eras, mediums, series, authors, publishers, q, yearMin, yearMax, releaseMin, releaseMax, releaseUndated, view, sort, openWorkId }),
    [eras, mediums, series, authors, publishers, q, yearMin, yearMax, releaseMin, releaseMax, releaseUndated, view, sort, openWorkId]
  );

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
    const id = setTimeout(() => {
      const next = writeToUrl({
        eras, mediums, series, authors, publishers,
        q, yearMin, yearMax, releaseMin, releaseMax, releaseUndated,
        view, sort, openWorkId,
      });
      const target = `${window.location.pathname}${next}`;
      if (target !== window.location.pathname + window.location.search) {
        window.history.replaceState({}, "", target);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [eras, mediums, series, authors, publishers, q, yearMin, yearMax, releaseMin, releaseMax, releaseUndated, view, sort, openWorkId]);

  if (status === "loading" || status === "idle") return <p className="p-4">Loading…</p>;
  if (status === "error") return <p className="p-4 text-red-600">Failed to load: {error}</p>;

  if (showLanding) {
    return (
      <Landing
        onPick={(_era: EraIndex) => setShowLanding(false)}
        onBrowseAll={() => setShowLanding(false)}
      />
    );
  }

  function handleHome() {
    clearAll();
    setShowLanding(true);
  }

  const visible = filterWorks(works, filterState);

  return (
    <>
      <AppShell onHome={handleHome}>
        <div className="flex h-full flex-col">
          <ActiveFilterChips />
          {view === "cards" && <CardGrid works={visible} />}
          {view === "table" && <TableView works={visible} />}
          {view === "timeline" && <TimelineView works={visible} />}
        </div>
      </AppShell>
      <WorkDetailModal />
    </>
  );
}
