import { useEffect } from "react";
import { useCatalogStore } from "./store/catalogStore";
import { useFilterStore } from "./store/filterStore";
import { readFromUrl, writeToUrl } from "./lib/urlState";
import { AppShell } from "./components/layout/AppShell";
import { filterWorks } from "./lib/filterWorks";
import { ActiveFilterChips } from "./components/filters/ActiveFilterChips";

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
      <ActiveFilterChips />
      <p className="text-sm text-muted-foreground">{visible.length} of {works.length} works</p>
    </AppShell>
  );
}
