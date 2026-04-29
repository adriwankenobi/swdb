import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { useFilterStore } from "@/store/filterStore";

export function EraTabs() {
  const { eras, set } = useFilterStore();

  const selectedEra = eras.length === 1 ? eras[0] : null;

  function pickEra(idx: EraIndex) {
    set({ eras: [idx] });
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b px-4 py-2">
      {ERAS.map((label, i) => {
        const idx = i as EraIndex;
        const active = selectedEra === idx;
        return (
          <button
            key={label}
            type="button"
            onClick={() => pickEra(idx)}
            className="rounded px-3 py-1 text-sm font-medium text-white transition hover:opacity-90"
            style={{
              backgroundColor: ERA_COLORS[idx],
              opacity: active ? 1 : 0.45,
              outline: active ? `2px solid ${ERA_COLORS[idx]}` : undefined,
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
