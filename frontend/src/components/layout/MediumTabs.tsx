import { MEDIUMS, MEDIUM_COLORS } from "@/constants/mediums";
import { useFilterStore } from "@/store/filterStore";

export function MediumTabs() {
  const { mediums, set } = useFilterStore();

  const selectedMedium = mediums.length === 1 ? mediums[0] : null;

  function pickMedium(idx: number) {
    set({ mediums: [idx] });
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
      {MEDIUMS.map((label, i) => {
        const active = selectedMedium === i;
        return (
          <button
            key={label}
            type="button"
            onClick={() => pickMedium(i)}
            className="rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
            style={{
              backgroundColor: MEDIUM_COLORS[i],
              opacity: active ? 1 : 0.45,
              outline: active ? `2px solid ${MEDIUM_COLORS[i]}` : undefined,
              outlineOffset: active ? "1px" : undefined,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
