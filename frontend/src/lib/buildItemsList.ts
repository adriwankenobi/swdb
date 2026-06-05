import type { DerivedCollection, Work } from "../types/work";
import type { ItemsMode } from "../store/filterStore";

export type Item =
  | { kind: "work"; work: Work }
  | { kind: "collection"; collection: DerivedCollection };

export function buildItemsList(
  works: Work[],
  collections: DerivedCollection[],
  items: ItemsMode,
): Item[] {
  if (items === "issues") {
    return works.map((w) => ({ kind: "work", work: w }));
  }
  const memberIds = new Set<string>();
  for (const c of collections) for (const id of c.member_ids) memberIds.add(id);
  const out: Item[] = [];
  for (const c of collections) out.push({ kind: "collection", collection: c });
  for (const w of works) {
    if (!memberIds.has(w.id)) out.push({ kind: "work", work: w });
  }
  return out;
}
