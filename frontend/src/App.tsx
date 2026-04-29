import { useEffect } from "react";
import { useCatalogStore } from "./store/catalogStore";
import { useFilterStore } from "./store/filterStore";
import { readFromUrl, writeToUrl } from "./lib/urlState";
import { AppShell } from "./components/layout/AppShell";
import { filterWorks } from "./lib/filterWorks";
import { ActiveFilterChips } from "./components/filters/ActiveFilterChips";
import { CardGrid } from "./components/views/CardGrid";

export default function App() {
  const { status, works, error, load } = useCatalogStore();
  const filterState = useFilterStore();

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

  const visible = filterWorks(works, filterState);

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <ActiveFilterChips />
        <p className="pb-3 text-sm text-muted-foreground">{visible.length} of {works.length} works</p>
        {filterState.view === "cards" && <CardGrid works={visible} />}
        {filterState.view === "table" && <p className="text-muted-foreground">Table view (Phase 7)</p>}
        {filterState.view === "timeline" && <p className="text-muted-foreground">Timeline view (Phase 8)</p>}
      </div>
    </AppShell>
  );
}
