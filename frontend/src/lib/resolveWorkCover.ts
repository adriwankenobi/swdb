import type { Work } from "../types/work";

export interface WorkCover {
  src: string | null;
  borrowed: boolean;
}

/** A work's cover: its own if set, else borrowed from a user collection that
 *  contains it (via coverByWorkId), else none. */
export function resolveWorkCover(
  work: Work,
  coverByWorkId: Map<string, string>,
): WorkCover {
  if (work.cover_url) return { src: work.cover_url, borrowed: false };
  const borrowed = coverByWorkId.get(work.id);
  if (borrowed) return { src: borrowed, borrowed: true };
  return { src: null, borrowed: false };
}
