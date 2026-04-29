import { useMemo, useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";
import { formatYear } from "@/lib/formatYear";

export function YearRangeFilter() {
  const works = useCatalogStore((s) => s.works);
  const { yearMin, yearMax, set } = useFilterStore();

  const sortedYears = useMemo(() => {
    const unique = Array.from(new Set(works.map((w) => w.year)));
    return unique.sort((a, b) => a - b);
  }, [works]);

  const maxIdx = sortedYears.length - 1;

  const initLow = useMemo(() => {
    if (yearMin === null || sortedYears.length === 0) return 0;
    const idx = sortedYears.findIndex((y) => y >= yearMin);
    return idx === -1 ? 0 : idx;
  }, [yearMin, sortedYears]);

  const initHigh = useMemo(() => {
    if (yearMax === null || sortedYears.length === 0) return maxIdx;
    let idx = maxIdx;
    for (let i = sortedYears.length - 1; i >= 0; i--) {
      if (sortedYears[i] <= yearMax) { idx = i; break; }
    }
    return idx;
  }, [yearMax, sortedYears, maxIdx]);

  const [lowIdx, setLowIdx] = useState(initLow);
  const [highIdx, setHighIdx] = useState(initHigh);

  useEffect(() => {
    if (yearMin === null && yearMax === null) {
      setLowIdx(0);
      setHighIdx(maxIdx);
    }
  }, [maxIdx, yearMin, yearMax]);

  if (sortedYears.length === 0) return null;

  function handleChange(v: number | readonly number[]) {
    const arr = Array.isArray(v) ? (v as number[]) : [v as number, v as number];
    const lo = arr[0];
    const hi = arr[1];
    setLowIdx(lo);
    setHighIdx(hi);
    set({ yearMin: sortedYears[lo], yearMax: sortedYears[hi] });
  }

  return (
    <div className="w-72 flex items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground whitespace-nowrap">Year</span>
      <Slider
        min={0}
        max={maxIdx}
        step={1}
        value={[lowIdx, highIdx]}
        onValueChange={handleChange}
        className="w-40"
      />
      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
        {formatYear(sortedYears[lowIdx])} – {formatYear(sortedYears[highIdx])}
      </span>
    </div>
  );
}
