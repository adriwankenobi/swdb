import type { Work } from "@/types/work";

export function formatSeriesAndNumber(work: Work): string {
  const series = work.series ?? [];
  if (series.length === 0) return "";
  const numbers = work.number ?? [];
  const isTv = work.medium === "TV Show";
  return series
    .map((s, i) => {
      const n = i < numbers.length ? numbers[i] : "";
      if (!n) return s;
      return isTv ? `${s} ${n}` : `${s} #${n}`;
    })
    .join(", ");
}
