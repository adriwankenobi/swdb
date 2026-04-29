import { useEffect } from "react";
import { useCatalogStore } from "./store/catalogStore";

export default function App() {
  const { status, works, error, load } = useCatalogStore();

  useEffect(() => {
    load(`${import.meta.env.BASE_URL}data/works.json`);
  }, [load]);

  if (status === "loading" || status === "idle")
    return <p style={{ padding: 16 }}>Loading…</p>;
  if (status === "error")
    return (
      <p style={{ padding: 16, color: "crimson" }}>
        Failed to load: {error}
      </p>
    );
  return (
    <main style={{ padding: 16 }}>
      <h1>SWDB</h1>
      <p>{works.length} works loaded.</p>
    </main>
  );
}
