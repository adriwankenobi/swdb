import type { Work } from "@/types/work";

export function formatSeriesAndNumber(work: Work): string {
  if (!work.series) return "";
  if (!work.number) return work.series;
  // TV Show: episode numbers are formatted without a "#" prefix.
  if (work.medium === "TV Show") {
    return `${work.series} ${work.number}`;
  }
  return `${work.series} #${work.number}`;
}
