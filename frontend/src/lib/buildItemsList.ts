import type { Collection, Work } from "../types/work";
import type { ItemsMode } from "../store/filterStore";

export type Item =
  | { kind: "work"; work: Work }
  | { kind: "collection"; collection: Collection };

export function buildItemsList(
  works: Work[],
  collections: Collection[],
  items: ItemsMode,
): Item[] {
  if (items === "issues") {
    return works.map((w) => ({ kind: "work", work: w }));
  }
  // A single work may be the anchor of multiple collections.
  const byAnchor = new Map<string, Collection[]>();
  for (const c of collections) {
    const arr = byAnchor.get(c.anchor_member_id) ?? [];
    arr.push(c);
    byAnchor.set(c.anchor_member_id, arr);
  }
  const memberCollectionIds = new Set<string>();
  for (const c of collections) for (const id of c.member_ids) memberCollectionIds.add(id);
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const w of works) {
    const anchors = byAnchor.get(w.id);
    if (anchors && anchors.length > 0) {
      for (const c of anchors) {
        out.push({ kind: "collection", collection: c });
        seen.add(c.id);
      }
      continue;
    }
    if (memberCollectionIds.has(w.id) && w.collection_ids && w.collection_ids.length > 0) {
      // Non-anchor member of one or more collections — skip.
      continue;
    }
    out.push({ kind: "work", work: w });
  }
  for (const c of collections) {
    if (!seen.has(c.id)) out.push({ kind: "collection", collection: c });
  }
  return out;
}
