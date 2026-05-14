import { useEffect, type RefObject } from "react";
import { useFilterStore } from "@/store/filterStore";

export function useScrollResetOnFilterChange(ref: RefObject<HTMLElement | null>) {
  const eras = useFilterStore((s) => s.eras);
  const mediums = useFilterStore((s) => s.mediums);
  const decades = useFilterStore((s) => s.decades);
  const series = useFilterStore((s) => s.series);
  const authors = useFilterStore((s) => s.authors);
  const publishers = useFilterStore((s) => s.publishers);
  const q = useFilterStore((s) => s.q);
  const releaseUndated = useFilterStore((s) => s.releaseUndated);
  const sort = useFilterStore((s) => s.sort);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [ref, eras, mediums, decades, series, authors, publishers, q, releaseUndated, sort]);
}
