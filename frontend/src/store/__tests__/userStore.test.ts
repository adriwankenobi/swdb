import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mock the supabase client module ---
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockOwnedDeleteIn = vi.fn(async () => ({ error: null }));
const mockFrom = vi.fn((table: string) => {
  if (table === "collections") return collectionsApi;
  if (table === "collection_members") return membersApi;
  return ownedApi; // "owned"
});

// ownedApi — matches the existing tests' expectations for mockInsert/mockDelete/mockSelect
const ownedApi = {
  insert: mockInsert,
  // .delete().eq("user_id", …) then either .eq("work_id", …) (toggleOwned)
  // or .in("work_id", […]) (deleteCollection).
  delete: () => ({ eq: () => ({ eq: mockDelete, in: mockOwnedDeleteIn }) }),
  // hydrateOwned now paginates: select(cols).range(a,b). Route range -> mockSelect.
  select: () => ({ range: () => mockSelect() }),
  upsert: vi.fn(async () => ({ error: null })),
};

// collectionsApi
const collectionsInsert = vi.fn(() => ({
  select: () => ({
    single: vi.fn(async () => ({ data: { id: "c-new" }, error: null })),
  }),
}));
const collectionsApi = {
  // paginated select(cols).range(a,b)
  select: vi.fn(() => ({ range: () => Promise.resolve({ data: [], error: null }) })),
  insert: collectionsInsert,
  update: () => ({ eq: vi.fn(async () => ({ error: null })) }),
  delete: () => ({ eq: vi.fn(async () => ({ error: null })) }),
};

// membersApi
const membersApi = {
  select: vi.fn(() => ({ range: () => Promise.resolve({ data: [], error: null }) })),
  insert: vi.fn(async () => ({ error: null })),
  delete: () => ({ eq: vi.fn(async () => ({ error: null })) }),
};

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(async () => ({ error: null })),
      signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    storage: {
      from: () => ({
        upload: vi.fn(async () => ({ data: { path: "p" }, error: null })),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  },
}));

import { useUserStore } from "../userStore";

function reset() {
  useUserStore.setState({
    session: { user: { id: "u1" } } as never,
    ownedIds: new Set<string>(),
    collections: [],
  });
  mockInsert.mockReset().mockResolvedValue({ error: null });
  mockDelete.mockReset().mockResolvedValue({ error: null });
  mockSelect.mockReset();
  mockFrom.mockClear();
  collectionsInsert.mockClear();
  collectionsApi.select.mockClear();
  membersApi.select.mockClear();
  membersApi.insert.mockClear();
  ownedApi.upsert.mockClear();
  mockOwnedDeleteIn.mockClear().mockResolvedValue({ error: null });
}

describe("userStore.toggleOwned", () => {
  beforeEach(reset);

  it("optimistically adds a work id and inserts a row", async () => {
    await useUserStore.getState().toggleOwned("w1");
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("owned");
    expect(mockInsert).toHaveBeenCalledWith({ user_id: "u1", work_id: "w1" });
  });

  it("optimistically removes an owned id and deletes the row", async () => {
    useUserStore.setState({ ownedIds: new Set(["w1"]) });
    await useUserStore.getState().toggleOwned("w1");
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(false);
  });

  it("reverts the optimistic add when the insert errors", async () => {
    mockInsert.mockResolvedValue({ error: { message: "boom" } });
    await useUserStore.getState().toggleOwned("w1");
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(false);
  });

  it("reverts the optimistic remove when the delete errors", async () => {
    useUserStore.setState({ ownedIds: new Set(["w1"]) });
    mockDelete.mockResolvedValue({ error: { message: "boom" } });
    await useUserStore.getState().toggleOwned("w1");
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(true);
  });

  it("is a no-op when signed out", async () => {
    useUserStore.setState({ session: null });
    await useUserStore.getState().toggleOwned("w1");
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("userStore.hydrateOwned", () => {
  beforeEach(reset);

  it("loads owned ids from supabase into the set", async () => {
    mockSelect.mockResolvedValue({ data: [{ work_id: "a" }, { work_id: "b" }], error: null });
    await useUserStore.getState().hydrateOwned();
    expect([...useUserStore.getState().ownedIds].sort()).toEqual(["a", "b"]);
  });
});

describe("userStore.collections", () => {
  beforeEach(reset);

  it("createCollection adds to state and marks members owned", async () => {
    useUserStore.setState({
      session: { user: { id: "u1" } } as never,
      collections: [],
      ownedIds: new Set(),
    });
    await useUserStore.getState().createCollection({ title: "Mine", member_ids: ["w1", "w2"] });
    const cols = useUserStore.getState().collections;
    const made = cols.find((c) => c.id === "c-new");
    expect(made?.title).toBe("Mine");
    expect(made?.member_ids).toEqual(["w1", "w2"]);
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(true);
    expect(useUserStore.getState().ownedIds.has("w2")).toBe(true);
  });

  it("deleteCollection removes it from state", async () => {
    useUserStore.setState({
      session: { user: { id: "u1" } } as never,
      collections: [{ id: "c1", title: "X", member_ids: [] }],
    });
    await useUserStore.getState().deleteCollection("c1");
    expect(useUserStore.getState().collections.find((c) => c.id === "c1")).toBeUndefined();
  });

  it("deleteCollection un-owns its members", async () => {
    useUserStore.setState({
      session: { user: { id: "u1" } } as never,
      collections: [{ id: "c1", title: "X", member_ids: ["w1", "w2"] }],
      ownedIds: new Set(["w1", "w2"]),
    });
    await useUserStore.getState().deleteCollection("c1");
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(false);
    expect(useUserStore.getState().ownedIds.has("w2")).toBe(false);
    expect(mockOwnedDeleteIn).toHaveBeenCalledWith("work_id", ["w1", "w2"]);
  });

  it("deleteCollection keeps members that still belong to another collection owned", async () => {
    useUserStore.setState({
      session: { user: { id: "u1" } } as never,
      collections: [
        { id: "c1", title: "X", member_ids: ["w1", "w2"] },
        { id: "c2", title: "Y", member_ids: ["w2"] },
      ],
      ownedIds: new Set(["w1", "w2"]),
    });
    await useUserStore.getState().deleteCollection("c1");
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(false);
    expect(useUserStore.getState().ownedIds.has("w2")).toBe(true);
    expect(mockOwnedDeleteIn).toHaveBeenCalledWith("work_id", ["w1"]);
  });

  it("setCollectionMembers un-owns works removed from the collection", async () => {
    useUserStore.setState({
      session: { user: { id: "u1" } } as never,
      collections: [{ id: "c1", title: "X", member_ids: ["w1", "w2", "w3"] }],
      ownedIds: new Set(["w1", "w2", "w3"]),
    });
    // Drop w3.
    await useUserStore.getState().setCollectionMembers("c1", ["w1", "w2"]);
    expect(useUserStore.getState().ownedIds.has("w3")).toBe(false);
    expect(useUserStore.getState().ownedIds.has("w1")).toBe(true);
    expect(mockOwnedDeleteIn).toHaveBeenCalledWith("work_id", ["w3"]);
  });

  it("setCollectionMembers keeps a removed work owned if it's in another collection", async () => {
    useUserStore.setState({
      session: { user: { id: "u1" } } as never,
      collections: [
        { id: "c1", title: "X", member_ids: ["w1", "w2"] },
        { id: "c2", title: "Y", member_ids: ["w2"] },
      ],
      ownedIds: new Set(["w1", "w2"]),
    });
    // Drop w2 from c1, but it's still in c2.
    await useUserStore.getState().setCollectionMembers("c1", ["w1"]);
    expect(useUserStore.getState().ownedIds.has("w2")).toBe(true);
    expect(mockOwnedDeleteIn).not.toHaveBeenCalled();
  });

  it("updateCollection patches the title in state", async () => {
    useUserStore.setState({
      session: { user: { id: "u1" } } as never,
      collections: [{ id: "c1", title: "Old", member_ids: [] }],
    });
    await useUserStore.getState().updateCollection("c1", { title: "New" });
    expect(useUserStore.getState().collections.find((c) => c.id === "c1")?.title).toBe("New");
  });
});

describe("userStore.uploadCover", () => {
  beforeEach(reset);
  it("uploads a file and returns a public URL under the user's folder when signed in", async () => {
    useUserStore.setState({ session: { user: { id: "u1" } } as never });
    const file = new File(["x"], "cover.png", { type: "image/png" });
    const res = await useUserStore.getState().uploadCover(file);
    expect(res.error).toBeNull();
    expect(res.url).toContain("https://cdn.test/");
    expect(res.url).toContain("u1/");
  });
  it("returns an error and no url when signed out", async () => {
    useUserStore.setState({ session: null });
    const res = await useUserStore.getState().uploadCover(new File(["x"], "c.png"));
    expect(res.url).toBeNull();
    expect(res.error).toBeTruthy();
  });
});
