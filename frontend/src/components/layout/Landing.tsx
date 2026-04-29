import { ERAS, ERA_COLORS, type EraIndex } from "@/constants/eras";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

interface LandingProps {
  onPick: (era: EraIndex) => void;
  onBrowseAll: () => void;
}

export function Landing({ onPick, onBrowseAll }: LandingProps) {
  const works = useCatalogStore((s) => s.works);
  const { set } = useFilterStore();

  function handlePick(idx: EraIndex) {
    set({ eras: [idx] });
    onPick(idx);
  }

  function handleBrowseAll() {
    set({ eras: [] });
    onBrowseAll();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-3">SWDB</h1>
        <p className="text-xl text-muted-foreground">
          Star Wars EU Catalog
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Personal browsable catalog of every work in the Expanded Universe
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 max-w-4xl w-full mb-10">
        {ERAS.map((label, i) => {
          const idx = i as EraIndex;
          const count = works.filter((w) => w.era === idx).length;
          return (
            <button
              key={label}
              type="button"
              onClick={() => handlePick(idx)}
              className="group flex flex-col items-center justify-center rounded-xl p-5 text-white transition hover:scale-105 hover:shadow-xl active:scale-100"
              style={{ backgroundColor: ERA_COLORS[idx] }}
            >
              <span className="text-sm font-bold text-center leading-tight mb-2 uppercase tracking-wide">
                {label}
              </span>
              <span className="text-2xl font-semibold">{count}</span>
              <span className="text-xs opacity-80 mt-1">works</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleBrowseAll}
        className="rounded-md border px-6 py-2 text-sm font-medium transition hover:bg-muted"
      >
        Browse all eras →
      </button>
    </div>
  );
}
