import { useEffect } from "react";
import { useCatalogStore } from "./store/catalogStore";
import { useFilterStore } from "./store/filterStore";
import { readFromUrl, writeToUrl } from "./lib/urlState";

export default function App() {
  const { status, works, error, load } = useCatalogStore();
  const filterState = useFilterStore();

  // Hydrate filter state from URL on mount.
  useEffect(() => {
    filterState.set(readFromUrl(window.location.search));
    load(`${import.meta.env.BASE_URL}data/works.json`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect filter state back to the URL on every change (debounced).
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

  if (status === "loading" || status === "idle") return <p style={{ padding: 16 }}>Loading…</p>;
  if (status === "error") return <p style={{ padding: 16, color: "crimson" }}>Failed to load: {error}</p>;
  return (
    <main style={{ padding: 16 }}>
      <h1>SWDB</h1>
      <p>{works.length} works loaded.</p>
    </main>
  );
}
