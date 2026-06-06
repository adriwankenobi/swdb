import type { DerivedCollection, Work } from "@/types/work";

/** A collection's display title with its number appended (e.g. "Title 1").
 *  The number belongs to the title, not to the series. */
export function formatCollectionTitle(
  c: Pick<DerivedCollection, "title" | "number">,
): string {
  return c.number != null ? `${c.title} ${c.number}` : c.title;
}

export function formatSeriesAndNumber(work: Work): string {
  const series = work.series ?? [];
  const numbers = work.number ?? [];
  if (series.length === 0) {
    return numbers.map((n) => `#${n}`).join(", ");
  }
  const isTv = work.medium === "TV Show";
  return series
    .map((s, i) => {
      const n = i < numbers.length ? numbers[i] : "";
      if (!n) return s;
      return isTv ? `${s} ${n}` : `${s} #${n}`;
    })
    .join(", ");
}
