// Optional, user-set physical/media format of a collection. Unlike era/medium
// (derived from member works), this is set directly on the collection. The
// frontend enum is the source of truth — the Supabase `type` column is plain
// `text` with no CHECK constraint.
export const COLLECTION_TYPES = [
  "Hardcover",
  "Softcover",
  "Single Issue",
  "TPB",
  "Omnibus",
  "DVD",
  "Blu-ray",
] as const;

export type CollectionType = (typeof COLLECTION_TYPES)[number];
