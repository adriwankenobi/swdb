import { ERAS, ERA_COLORS } from "@/constants/eras";
import { useFilterStore } from "@/store/filterStore";

export function EraTabs() {
  const { eras, set, toggleArrayValue } = useFilterStore();

  return (
    <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b px-4 py-2 md:flex-wrap md:overflow-visible md:whitespace-normal">
      <button
        type="button"
        onClick={() => set({ eras: [] })}
        className={[
          "shrink-0 rounded px-3 py-1 text-sm font-medium transition",
          eras.length === 0
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        ].join(" ")}
      >
        All
      </button>
      {ERAS.map((era) => {
        const active = eras.includes(era);
        return (
          <button
            key={era}
            type="button"
            onClick={() => toggleArrayValue("eras", era)}
            className="shrink-0 rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
            style={{
              backgroundColor: ERA_COLORS[era],
              opacity: active ? 1 : 0.45,
              outline: active ? `2px solid ${ERA_COLORS[era]}` : undefined,
              outlineOffset: active ? "1px" : undefined,
            }}
          >
            {era}
          </button>
        );
      })}
    </div>
  );
}
