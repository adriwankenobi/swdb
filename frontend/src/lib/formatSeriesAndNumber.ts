import type { Work } from "@/types/work";

// TV Show is medium index 5 — no "#" prefix before episode numbers
const TV_SHOW_INDEX = 5;

export function formatSeriesAndNumber(work: Work): string {
  if (!work.series) return "";
  if (!work.number) return work.series;
  if (work.medium === TV_SHOW_INDEX) {
    return `${work.series} ${work.number}`;
  }
  return `${work.series} #${work.number}`;
}
