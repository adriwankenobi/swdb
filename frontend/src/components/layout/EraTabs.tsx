import { ERAS, ERA_COLORS } from "@/constants/eras";
import { useFilterStore } from "@/store/filterStore";

export function EraTabs() {
  const { eras, set, toggleArrayValue } = useFilterStore();

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-4 py-2">
      <button
        type="button"
        onClick={() => set({ eras: [] })}
        className={[
          "rounded px-3 py-1 text-sm font-medium transition",
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
            className="rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
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
