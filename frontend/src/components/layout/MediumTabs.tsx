import { MEDIUMS, MEDIUM_COLORS, type MediumName } from "@/constants/mediums";
import { useFilterStore } from "@/store/filterStore";

export function MediumTabs() {
  const { mediums, set } = useFilterStore();

  const selectedMedium = mediums.length === 1 ? mediums[0] : null;

  function pickMedium(medium: MediumName) {
    set({ mediums: [medium] });
  }

  function clearMedium() {
    set({ mediums: [] });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={clearMedium}
        className={[
          "rounded px-3 py-1 text-sm font-medium transition",
          mediums.length === 0
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        ].join(" ")}
      >
        All
      </button>
      {MEDIUMS.map((medium) => {
        const active = selectedMedium === medium;
        return (
          <button
            key={medium}
            type="button"
            onClick={() => pickMedium(medium)}
            className="rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
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
