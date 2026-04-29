import { useMemo } from "react";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { DECADE_COLORS } from "@/constants/decades";

const UNKNOWN_COLOR = "#6b7280"; // neutral gray for the "no release_date" bucket

export function DecadeTabs() {
  const works = useCatalogStore((s) => s.works);
  const { releaseMin, releaseMax, releaseUndated, set } = useFilterStore();

  const { decades, hasUndated } = useMemo(() => {
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
      decades: Array.from(decadeSet).sort((a, b) => a - b),
      hasUndated: undated,
    };
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
      releaseUndated: false,
    });
  }

  function pickUnknown() {
    set({ releaseMin: null, releaseMax: null, releaseUndated: true });
  }

  const allActive = releaseMin === null && releaseMax === null && !releaseUndated;

  function clearDecade() {
    set({ releaseMin: null, releaseMax: null, releaseUndated: false });
  }

  if (decades.length === 0 && !hasUndated) return null;

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
      {decades.map((dec) => {
        const isActive = active === dec;
        const color = DECADE_COLORS[dec] ?? "#3a6cba";
        return (
          <button
            key={dec}
            type="button"
            onClick={() => pickDecade(dec)}
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
          onClick={pickUnknown}
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
