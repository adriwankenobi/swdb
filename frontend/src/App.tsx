import { useEffect, useState } from "react";
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
  const filterState = useFilterStore();

  // Show landing on fresh visit (no query params), stay in catalog if URL has filters
  const [showLanding, setShowLanding] = useState<boolean>(
    () => window.location.search === ""
  );

  useEffect(() => {
    filterState.set(readFromUrl(window.location.search));
    load(`${import.meta.env.BASE_URL}data/works.json`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = writeToUrl(filterState);
      const target = `${window.location.pathname}${next}`;
      if (target !== window.location.pathname + window.location.search) {
        window.history.replaceState({}, "", target);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [filterState]);

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
    filterState.clearAll();
    setShowLanding(true);
  }

  const visible = filterWorks(works, filterState);

  return (
    <>
      <AppShell onHome={handleHome}>
        <div className="flex h-full flex-col">
          <ActiveFilterChips />
          {filterState.view === "cards" && <CardGrid works={visible} />}
          {filterState.view === "table" && <TableView works={visible} />}
          {filterState.view === "timeline" && <TimelineView works={visible} />}
        </div>
      </AppShell>
      <WorkDetailModal />
    </>
  );
}
