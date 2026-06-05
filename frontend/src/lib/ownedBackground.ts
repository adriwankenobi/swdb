/** Background color for a work cell, driven purely by ownership.
 *  Owned → the themed green (`--owned-bg`, defined in the global stylesheet,
 *  with a dark-mode value). Unowned / logged-out → the provided fallback. */
export function ownedBackground(isOwned: boolean, fallback = "var(--card)"): string {
  return isOwned ? "var(--owned-bg)" : fallback;
}
