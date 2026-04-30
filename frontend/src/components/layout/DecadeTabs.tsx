import { useMemo } from "react";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { DECADE_COLORS } from "@/constants/decades";

const UNKNOWN_COLOR = "#6b7280"; // neutral gray for the "no release_date" bucket

export function DecadeTabs() {
  const works = useCatalogStore((s) => s.works);
  const { decades, releaseUndated, set, toggleArrayValue } = useFilterStore();

  const { availableDecades, hasUndated } = useMemo(() => {
    const decadeSet = new Set<number>();
    let undated = false;
    for (const w of works) {
      if (w.release_date) {
        const year = parseInt(w.release_date.slice(0, 4), 10);
        if (!isNaN(year)) {
          decadeSet.add(Math.floor(year / 10) * 10);
        }
      } else {
        undated = true;
      }
    }
    return {
      availableDecades: Array.from(decadeSet).sort((a, b) => a - b),
      hasUndated: undated,
    };
  }, [works]);

  const allActive = decades.length === 0 && !releaseUndated;

  function clearDecade() {
    set({ decades: [], releaseUndated: false });
  }

  function toggleUnknown() {
    set({ releaseUndated: !releaseUndated });
  }

  if (availableDecades.length === 0 && !hasUndated) return null;

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
      {availableDecades.map((dec) => {
        const isActive = decades.includes(dec);
        const color = DECADE_COLORS[dec] ?? "#3a6cba";
        return (
          <button
            key={dec}
            type="button"
            onClick={() => toggleArrayValue("decades", dec)}
            className="rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
            style={{
              backgroundColor: color,
              opacity: isActive ? 1 : 0.45,
              outline: isActive ? `2px solid ${color}` : undefined,
              outlineOffset: isActive ? "1px" : undefined,
            }}
          >
            {dec}s
          </button>
        );
      })}
      {hasUndated && (
        <button
          key="unknown"
          type="button"
          onClick={toggleUnknown}
          className="rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
          style={{
            backgroundColor: UNKNOWN_COLOR,
            opacity: releaseUndated ? 1 : 0.45,
            outline: releaseUndated ? `2px solid ${UNKNOWN_COLOR}` : undefined,
            outlineOffset: releaseUndated ? "1px" : undefined,
          }}
        >
          Unknown
        </button>
      )}
    </div>
  );
}
