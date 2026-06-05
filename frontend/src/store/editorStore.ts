import { create } from "zustand";

/** Which collection the editor dialog is editing:
 *  null = closed, "new" = create mode, otherwise a collection id (edit mode). */
interface EditorState {
  target: "new" | string | null;
  /** Optional work id to pre-add as the first member when creating. */
  seedWorkId: string | null;
  openNew: (seedWorkId?: string) => void;
  openEdit: (collectionId: string) => void;
  close: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  target: null,
  seedWorkId: null,
  openNew: (seedWorkId) => set({ target: "new", seedWorkId: seedWorkId ?? null }),
  openEdit: (collectionId) => set({ target: collectionId, seedWorkId: null }),
  close: () => set({ target: null, seedWorkId: null }),
}));
