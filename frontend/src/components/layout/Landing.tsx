import { ERAS, ERA_COLORS, type EraName } from "@/constants/eras";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

interface LandingProps {
  onPick: (era: EraName) => void;
  onBrowseAll: () => void;
}

export function Landing({ onPick, onBrowseAll }: LandingProps) {
  const works = useCatalogStore((s) => s.works);
  const { set } = useFilterStore();

  function handlePick(era: EraName) {
    set({ eras: [era] });
    onPick(era);
  }

  function handleBrowseAll() {
    set({ eras: [] });
    onBrowseAll();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 py-6 md:justify-center md:py-16">
      <div className="mb-6 text-center md:mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2 md:text-5xl md:mb-3">SWDB</h1>
        <p className="text-base text-muted-foreground md:text-xl">
          Star Wars EU Catalog
        </p>
        <p className="mt-1 text-xs text-muted-foreground md:mt-2 md:text-sm">
          Personal browsable catalog of every work in the Expanded Universe
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 max-w-4xl w-full mb-6 md:mb-10">
        {ERAS.map((era) => {
          const count = works.filter((w) => w.era === era).length;
          return (
            <button
              key={era}
              type="button"
              onClick={() => handlePick(era)}
              className="group flex flex-col items-center justify-center rounded-xl p-3 text-white transition hover:scale-105 hover:shadow-xl active:scale-100 md:p-5"
              style={{ backgroundColor: ERA_COLORS[era] }}
            >
              <span className="text-xs font-bold text-center leading-tight mb-1 uppercase tracking-wide md:text-sm md:mb-2">
                {era}
              </span>
              <span className="text-xl font-semibold md:text-2xl">{count}</span>
              <span className="text-[10px] opacity-80 mt-0.5 md:text-xs md:mt-1">works</span>
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
