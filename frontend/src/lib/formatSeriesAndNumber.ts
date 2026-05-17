import type { Work } from "@/types/work";

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
