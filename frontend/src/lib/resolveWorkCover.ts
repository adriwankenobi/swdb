import type { Work, Collection } from "@/types/work";

export type WorkCover =
  | { src: string; borrowed: false }
  | { src: string; borrowed: true }
  | { src: null; borrowed: false };

export function resolveWorkCover(
  work: Work,
  collectionsById: Map<string, Collection>,
): WorkCover {
  if (work.cover_url) return { src: work.cover_url, borrowed: false };
  for (const id of work.collection_ids ?? []) {
    const c = collectionsById.get(id);
    if (c?.cover_url) return { src: c.cover_url, borrowed: true };
  }
  return { src: null, borrowed: false };
}
