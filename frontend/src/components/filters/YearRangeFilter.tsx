import { Slider } from "@/components/ui/slider";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { formatYear } from "@/lib/formatYear";

export function YearRangeFilter() {
  const { yearMin: dataMin, yearMax: dataMax } = useCatalogStore((s) => s.facets);
  const { yearMin, yearMax, set } = useFilterStore();
  const lo = yearMin ?? dataMin;
  const hi = yearMax ?? dataMax;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Year (in-universe)</h3>
      <Slider
        min={dataMin}
        max={dataMax}
        step={1}
        value={[lo, hi]}
        onValueChange={(v) => {
          const arr = Array.isArray(v) ? v : [v, v];
          set({ yearMin: arr[0] as number, yearMax: arr[1] as number });
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatYear(lo)}</span>
        <span>{formatYear(hi)}</span>
      </div>
    </section>
  );
}
