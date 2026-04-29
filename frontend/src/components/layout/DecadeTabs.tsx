import { useMemo } from "react";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { DECADE_COLORS } from "@/constants/decades";

export function DecadeTabs() {
  const works = useCatalogStore((s) => s.works);
  const { releaseMin, releaseMax, set } = useFilterStore();

  const decades = useMemo(() => {
    const set = new Set<number>();
    for (const w of works) {
      if (w.release_date) {
        const year = parseInt(w.release_date.slice(0, 4), 10);
        if (!isNaN(year)) {
          set.add(Math.floor(year / 10) * 10);
        }
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [works]);

  function activeDecade(): number | null {
    if (!releaseMin || !releaseMax) return null;
    // Check if releaseMin/Max exactly bracket a decade
    const minMatch = releaseMin.match(/^(\d{4})-01-01$/);
    const maxMatch = releaseMax.match(/^(\d{4})-12-31$/);
    if (!minMatch || !maxMatch) return null;
    const minYear = parseInt(minMatch[1], 10);
    const maxYear = parseInt(maxMatch[1], 10);
    const dec = Math.floor(minYear / 10) * 10;
    if (minYear === dec && maxYear === dec + 9) return dec;
    return null;
  }

  const active = activeDecade();

  function pickDecade(dec: number) {
    set({
      releaseMin: `${dec}-01-01`,
      releaseMax: `${dec + 9}-12-31`,
    });
  }

  const allActive = releaseMin === null && releaseMax === null;

  function clearDecade() {
    set({ releaseMin: null, releaseMax: null });
  }

  if (decades.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-4 py-2">
      <button
        type="button"
        onClick={clearDecade}
        className={[
          "rounded px-3 py-1 text-sm font-medium transition",
          allActive
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        ].join(" ")}
      >
        All
      </button>
      {decades.map((dec) => (
        <button
          key={dec}
          type="button"
          onClick={() => pickDecade(dec)}
          className={[
            "rounded px-3 py-1 text-sm font-medium transition",
            active === dec ? "" : "bg-muted text-muted-foreground hover:bg-muted/80",
          ].join(" ")}
          style={
            active === dec
              ? { backgroundColor: DECADE_COLORS[dec] ?? "#3a6cba", color: "white" }
              : undefined
          }
        >
          {dec}s
        </button>
      ))}
    </div>
  );
}
