import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useFilterStore } from "./filterStore";
import type { UserCollection } from "../types/work";

// PostgREST caps a select() at 1000 rows by default, so fetch in pages and
// concatenate — owned/collection_members can exceed 1000.
const PAGE = 1000;
async function selectAll<T = Record<string, unknown>>(
  table: string,
  columns: string,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = (await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1)) as unknown as {
      data: T[] | null;
      error: { message: string } | null;
    };
    if (error) return { data: null, error };
    if (data && data.length > 0) out.push(...data);
    if (!data || data.length < PAGE) break;
  }
  return { data: out, error: null };
}

interface UserState {
  session: Session | null;
  ownedIds: Set<string>;
  collections: UserCollection[];
  init: () => () => void;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  hydrateOwned: () => Promise<void>;
  hydrateCollections: () => Promise<void>;
  toggleOwned: (workId: string) => Promise<void>;
  createCollection: (args: { title: string; number?: number; info_url?: string; cover_url?: string; member_ids: string[] }) => Promise<{ error: string | null }>;
  updateCollection: (id: string, patch: { title?: string; number?: number | null; info_url?: string | null; cover_url?: string | null }) => Promise<{ error: string | null }>;
  deleteCollection: (id: string) => Promise<void>;
  setCollectionMembers: (id: string, orderedWorkIds: string[]) => Promise<{ error: string | null }>;
  uploadCover: (file: File) => Promise<{ url: string | null; error: string | null }>;
}

export const useUserStore = create<UserState>((set, get) => ({
  session: null,
  ownedIds: new Set<string>(),
  collections: [],

  init: () => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) {
        void get().hydrateOwned();
        void get().hydrateCollections();
      } else {
        set({ ownedIds: new Set<string>(), collections: [] });
      }
    });
    return () => subscription.unsubscribe();
  },

  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    // When "Confirm email" is on, signUp returns a user but no session — the
    // user must confirm via email before they can sign in.
    return { error: null, needsConfirmation: data.session === null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    // Clear immediately so the UI updates before the auth listener fires.
    set({ session: null, ownedIds: new Set<string>(), collections: [] });
    // Reset ownership + collection filters so a signed-out user is never stuck
    // filtering by data that no longer exists.
    useFilterStore.getState().set({ ownership: "all", collections: [] });
  },

  hydrateOwned: async () => {
    const { data, error } = await selectAll<{ work_id: string }>("owned", "work_id");
    if (error || !data) return; // non-fatal: owned list stays as-is
    set({ ownedIds: new Set(data.map((r) => r.work_id)) });
  },

  hydrateCollections: async () => {
    const [colsResult, membersResult] = await Promise.all([
      selectAll<{ id: string; title: string; number: number | null; info_url: string | null; cover_url: string | null }>(
        "collections",
        "id,title,number,info_url,cover_url",
      ),
      selectAll<{ collection_id: string; work_id: string; position: number }>(
        "collection_members",
        "collection_id,work_id,position",
      ),
    ]);
    if (colsResult.error || !colsResult.data) return;
    if (membersResult.error || !membersResult.data) return;

    // Group members by collection, sorted by position.
    const membersByCol = new Map<string, Array<{ work_id: string; position: number }>>();
    for (const row of membersResult.data as Array<{ collection_id: string; work_id: string; position: number }>) {
      const arr = membersByCol.get(row.collection_id) ?? [];
      arr.push({ work_id: row.work_id, position: row.position });
      membersByCol.set(row.collection_id, arr);
    }

    const collections: UserCollection[] = (
      colsResult.data as Array<{ id: string; title: string; number: number | null; info_url: string | null; cover_url: string | null }>
    ).map((row) => {
      const members = (membersByCol.get(row.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((m) => m.work_id);
      return {
        id: row.id,
        title: row.title,
        ...(row.number != null ? { number: row.number } : {}),
        ...(row.info_url != null ? { info_url: row.info_url } : {}),
        ...(row.cover_url != null ? { cover_url: row.cover_url } : {}),
        member_ids: members,
      };
    });

    set({ collections });
  },

  toggleOwned: async (workId) => {
    const { session, ownedIds } = get();
    if (!session) return;
    const userId = session.user.id;
    const willOwn = !ownedIds.has(workId);

    // Optimistic update.
    const next = new Set(ownedIds);
    if (willOwn) next.add(workId);
    else next.delete(workId);
    set({ ownedIds: next });

    const { error } = willOwn
      ? await supabase.from("owned").insert({ user_id: userId, work_id: workId })
      : await supabase.from("owned").delete().eq("user_id", userId).eq("work_id", workId);

    if (error) {
      // Revert on failure.
      const reverted = new Set(get().ownedIds);
      if (willOwn) reverted.delete(workId);
      else reverted.add(workId);
      set({ ownedIds: reverted });
    }
  },

  createCollection: async ({ title, number, info_url, cover_url, member_ids }) => {
    if (!get().session) return { error: "Not signed in" };
    const userId = get().session!.user.id;

    const { data, error } = await supabase
      .from("collections")
      .insert({ user_id: userId, title, ...(number != null ? { number } : {}), ...(info_url ? { info_url } : {}), ...(cover_url ? { cover_url } : {}) })
      .select("id")
      .single();

    if (error || !data) return { error: error?.message ?? "Could not create the collection" };

    const newCollection: UserCollection = {
      id: data.id,
      title,
      ...(number != null ? { number } : {}),
      ...(info_url ? { info_url } : {}),
      ...(cover_url ? { cover_url } : {}),
      member_ids: [],
    };

    set((state) => ({ collections: [...state.collections, newCollection] }));

    if (member_ids.length > 0) {
      return await get().setCollectionMembers(data.id, member_ids);
    }
    return { error: null };
  },

  updateCollection: async (id, patch) => {
    const { error } = await (supabase
      .from("collections")
      .update({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.number !== undefined ? { number: patch.number } : {}),
        ...(patch.info_url !== undefined ? { info_url: patch.info_url } : {}),
        ...(patch.cover_url !== undefined ? { cover_url: patch.cover_url } : {}),
      })
      .eq("id", id) as unknown as Promise<{ error: { message: string } | null }>);

    if (error) return { error: error.message };

    set((state) => ({
      collections: state.collections.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c };
        if (patch.title !== undefined) updated.title = patch.title;
        if (patch.number !== undefined) {
          if (patch.number === null) delete updated.number;
          else updated.number = patch.number;
        }
        if (patch.info_url !== undefined) {
          if (patch.info_url === null) delete updated.info_url;
          else updated.info_url = patch.info_url;
        }
        if (patch.cover_url !== undefined) {
          if (patch.cover_url === null) delete updated.cover_url;
          else updated.cover_url = patch.cover_url;
        }
        return updated;
      }),
    }));
    return { error: null };
  },

  deleteCollection: async (id) => {
    const { session, collections, ownedIds } = get();
    if (!session) return;
    const userId = session.user.id;

    // Deleting a collection un-owns its members — but keep any member that
    // still belongs to another collection (its membership keeps it owned).
    const target = collections.find((c) => c.id === id);
    const stillMember = new Set<string>();
    for (const c of collections) {
      if (c.id === id) continue;
      for (const wid of c.member_ids) stillMember.add(wid);
    }
    const toUnown = (target?.member_ids ?? []).filter((wid) => !stillMember.has(wid));

    await (supabase.from("collections").delete().eq("id", id) as unknown as Promise<{ error: unknown }>);
    if (toUnown.length > 0) {
      await (supabase.from("owned").delete().eq("user_id", userId).in("work_id", toUnown) as unknown as Promise<{ error: unknown }>);
    }

    const nextOwned = new Set(ownedIds);
    for (const wid of toUnown) nextOwned.delete(wid);
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      ownedIds: nextOwned,
    }));
  },

  setCollectionMembers: async (id, orderedWorkIds) => {
    if (!get().session) return { error: "Not signed in" };
    const userId = get().session!.user.id;

    // Works dropped from this collection should go unowned — unless they're
    // still a member of another collection (membership keeps them owned).
    const collections = get().collections;
    const nextSet = new Set(orderedWorkIds);
    const prevMembers = collections.find((c) => c.id === id)?.member_ids ?? [];
    const stillMember = new Set<string>();
    for (const c of collections) {
      if (c.id === id) continue;
      for (const wid of c.member_ids) stillMember.add(wid);
    }
    const toUnown = prevMembers.filter((wid) => !nextSet.has(wid) && !stillMember.has(wid));

    // Delete existing members for this collection.
    const del = (await (supabase.from("collection_members").delete().eq("collection_id", id) as unknown as Promise<{ error: { message: string } | null }>));
    if (del.error) return { error: del.error.message };

    // Insert new member rows with position.
    if (orderedWorkIds.length > 0) {
      const rows = orderedWorkIds.map((work_id, position) => ({
        collection_id: id,
        work_id,
        position,
      }));
      const ins = await supabase.from("collection_members").insert(rows);
      if (ins.error) return { error: ins.error.message };

      // Upsert owned rows for all members so they're marked as owned.
      const ownedRows = orderedWorkIds.map((work_id) => ({ user_id: userId, work_id }));
      const up = await supabase.from("owned").upsert(ownedRows, { onConflict: "user_id,work_id", ignoreDuplicates: true });
      if (up.error) return { error: up.error.message };
    }

    // Un-own works removed from the collection.
    if (toUnown.length > 0) {
      await (supabase.from("owned").delete().eq("user_id", userId).in("work_id", toUnown) as unknown as Promise<{ error: unknown }>);
    }

    // Update local state.
    const next = new Set(get().ownedIds);
    for (const wid of orderedWorkIds) next.add(wid);
    for (const wid of toUnown) next.delete(wid);
    set((state) => ({
      ownedIds: next,
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, member_ids: orderedWorkIds } : c,
      ),
    }));
    return { error: null };
  },

  uploadCover: async (file) => {
    const userId = get().session?.user.id;
    if (!userId) return { url: null, error: "Not signed in" };
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("covers")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) return { url: null, error: (error as { message: string }).message };
    const { data } = supabase.storage.from("covers").getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  },
}));
