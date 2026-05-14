import { MEDIUMS, MEDIUM_COLORS } from "@/constants/mediums";
import { useFilterStore } from "@/store/filterStore";

export function MediumTabs() {
  const { mediums, set, toggleArrayValue } = useFilterStore();

  return (
    <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap md:flex-wrap md:overflow-visible md:whitespace-normal">
      <button
        type="button"
        onClick={() => set({ mediums: [] })}
        className={[
          "shrink-0 rounded px-3 py-1 text-sm font-medium transition",
          mediums.length === 0
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        ].join(" ")}
      >
        All
      </button>
      {MEDIUMS.map((medium) => {
        const active = mediums.includes(medium);
        return (
          <button
            key={medium}
            type="button"
            onClick={() => toggleArrayValue("mediums", medium)}
            className="shrink-0 rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
            style={{
              backgroundColor: MEDIUM_COLORS[medium],
              opacity: active ? 1 : 0.45,
              outline: active ? `2px solid ${MEDIUM_COLORS[medium]}` : undefined,
              outlineOffset: active ? "1px" : undefined,
            }}
          >
            {medium}
          </button>
        );
      })}
    </div>
  );
}
