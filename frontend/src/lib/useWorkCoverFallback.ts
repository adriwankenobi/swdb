import { useMemo } from "react";
import { useDerivedCollections } from "./useDerivedCollections";

/** workId -> cover_url borrowed from the first user collection that contains
 *  the work and has a cover. Empty when signed out. */
export function useWorkCoverFallback(): Map<string, string> {
  const collections = useDerivedCollections();
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const c of collections) {
      if (!c.cover_url) continue;
      for (const id of c.member_ids) {
        if (!m.has(id)) m.set(id, c.cover_url);
      }
    }
    return m;
  }, [collections]);
}
