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
    <div className="flex flex-wrap items-center gap-1 border-b px-4 py-2">
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
            className="rounded px-3 py-1 text-sm font-medium transition"
            style={
              active
                ? { backgroundColor: MEDIUM_COLORS[i], color: "white" }
                : { border: "1px solid currentColor", opacity: 0.6 }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
