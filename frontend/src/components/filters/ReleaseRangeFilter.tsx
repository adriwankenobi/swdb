import { useMemo, useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { useCatalogStore } from "@/store/catalogStore";
import { useFilterStore } from "@/store/filterStore";

function formatRelease(iso: string): string {
  // Show just the year for compactness
  return iso.slice(0, 4);
}

export function ReleaseRangeFilter() {
  const works = useCatalogStore((s) => s.works);
  const { releaseMin, releaseMax, set } = useFilterStore();

  const sortedDates = useMemo(() => {
    const unique = Array.from(
      new Set(works.map((w) => w.release_date).filter((d): d is string => !!d))
    );
    return unique.sort();
  }, [works]);

  const maxIdx = sortedDates.length - 1;

  const initLow = useMemo(() => {
    if (releaseMin === null || sortedDates.length === 0) return 0;
    const idx = sortedDates.findIndex((d) => d >= releaseMin);
    return idx === -1 ? 0 : idx;
  }, [releaseMin, sortedDates]);

  const initHigh = useMemo(() => {
    if (releaseMax === null || sortedDates.length === 0) return maxIdx;
    let idx = maxIdx;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      if (sortedDates[i] <= releaseMax) { idx = i; break; }
    }
    return idx;
  }, [releaseMax, sortedDates, maxIdx]);

  const [lowIdx, setLowIdx] = useState(initLow);
  const [highIdx, setHighIdx] = useState(initHigh);

  // Reset when catalog loads or filter cleared
  useEffect(() => {
    if (releaseMin === null && releaseMax === null) {
      setLowIdx(0);
      setHighIdx(maxIdx);
    }
  }, [maxIdx, releaseMin, releaseMax]);

  if (sortedDates.length === 0) return null;

  function handleChange(v: number | readonly number[]) {
    const arr = Array.isArray(v) ? (v as number[]) : [v as number, v as number];
    const lo = arr[0];
    const hi = arr[1];
    setLowIdx(lo);
    setHighIdx(hi);
    set({ releaseMin: sortedDates[lo], releaseMax: sortedDates[hi] });
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Release date</h3>
      <Slider
        min={0}
        max={maxIdx}
        step={1}
        value={[lowIdx, highIdx]}
        onValueChange={handleChange}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatRelease(sortedDates[lowIdx])}</span>
        <span>{formatRelease(sortedDates[highIdx])}</span>
      </div>
    </section>
  );
}
