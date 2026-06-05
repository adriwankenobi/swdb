import { useMemo } from "react";
import { useUserStore } from "../store/userStore";
import { useCatalogStore } from "../store/catalogStore";
import { deriveCollection } from "./deriveCollection";
import type { DerivedCollection } from "../types/work";

/** Build display-ready collections from the user's raw collections + catalog.
 *  Returns [] when signed out. */
export function useDerivedCollections(): DerivedCollection[] {
  const collections = useUserStore((s) => s.collections);
  const session = useUserStore((s) => s.session);
  const worksById = useCatalogStore((s) => s.worksById);
  return useMemo(() => {
    if (!session) return [];
    return collections.map((c) => deriveCollection(c, worksById));
  }, [collections, session, worksById]);
}
