import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  XIcon,
  UploadIcon,
} from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useUserStore } from "@/store/userStore";
import { useCatalogStore } from "@/store/catalogStore";
import { WorkPicker } from "@/components/work/WorkPicker";
import { formatSeriesAndNumber } from "@/lib/formatSeriesAndNumber";
import { COLLECTION_TYPES, type CollectionType } from "@/constants/collectionTypes";

const MAX_COVER_BYTES = 1024 * 1024; // 1MB

export function CollectionEditorDialog() {
  const target = useEditorStore((s) => s.target);
  const seedWorkId = useEditorStore((s) => s.seedWorkId);
  const close = useEditorStore((s) => s.close);

  const collections = useUserStore((s) => s.collections);
  const createCollection = useUserStore((s) => s.createCollection);
  const updateCollection = useUserStore((s) => s.updateCollection);
  const setCollectionMembers = useUserStore((s) => s.setCollectionMembers);
  const uploadCover = useUserStore((s) => s.uploadCover);

  const worksById = useCatalogStore((s) => s.worksById);

  const editing =
    target && target !== "new"
      ? (collections.find((c) => c.id === target) ?? null)
      : null;

  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");
  const [infoUrl, setInfoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload when the dialog opens / target changes.
  useEffect(() => {
    if (target === null) return;
    if (editing) {
      setTitle(editing.title);
      setNumber(editing.number != null ? String(editing.number) : "");
      setType(editing.type ?? "");
      setInfoUrl(editing.info_url ?? "");
      setCoverUrl(editing.cover_url ?? "");
      setMemberIds(editing.member_ids);
    } else {
      setTitle("");
      setNumber("");
      setType("");
      setInfoUrl("");
      setCoverUrl("");
      setMemberIds(seedWorkId ? [seedWorkId] : []);
    }
    setError(null);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const exclude = useMemo(() => new Set(memberIds), [memberIds]);

  function move(i: number, dir: -1 | 1) {
    setMemberIds((ids) => {
      const j = i + dir;
      if (j < 0 || j >= ids.length) return ids;
      const next = [...ids];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function onUpload(file: File) {
    if (file.size > MAX_COVER_BYTES) {
      setError("Image is too large. Maximum size is 1MB.");
      return;
    }
    setBusy(true);
    setError(null);
    const { url, error: uploadError } = await uploadCover(file);
    setBusy(false);
    if (uploadError) setError(uploadError);
    else if (url) setCoverUrl(url);
  }

  async function onSave() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const num =
      number.trim() === "" ? null : Number.parseInt(number, 10);
    const patch = {
      title: title.trim(),
      number: num != null && Number.isNaN(num) ? null : num,
      type: (type as CollectionType) || null,
      info_url: infoUrl.trim() || null,
      cover_url: coverUrl.trim() || null,
    };
    try {
      if (editing) {
        const u = await updateCollection(editing.id, patch);
        if (u.error) { setError(u.error); return; }
        const m = await setCollectionMembers(editing.id, memberIds);
        if (m.error) { setError(m.error); return; }
      } else {
        const c = await createCollection({
          title: patch.title,
          ...(patch.number != null ? { number: patch.number } : {}),
          ...(patch.type != null ? { type: patch.type } : {}),
          ...(patch.info_url != null ? { info_url: patch.info_url } : {}),
          ...(patch.cover_url != null ? { cover_url: patch.cover_url } : {}),
          member_ids: memberIds,
        });
        if (c.error) { setError(c.error); return; }
      }
      close(); // only on success
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="!max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit collection" : "New collection"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            type="number"
            placeholder="# (optional)"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          >
            <option value="">Type (optional)</option>
            {COLLECTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input
            type="url"
            placeholder="Info link (optional)"
            value={infoUrl}
            onChange={(e) => setInfoUrl(e.target.value)}
          />
          {/* Cover: paste URL or upload */}
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="Cover image URL (or upload below)"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
            <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <UploadIcon className="size-3.5" /> Upload image (max 1MB)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUpload(f);
                  e.target.value = ""; // allow re-selecting the same file
                }}
              />
            </label>
            {coverUrl && (
              <img
                src={coverUrl}
                alt=""
                className="h-24 w-16 rounded object-cover"
              />
            )}
          </div>
          {/* Members */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Works ({memberIds.length})</p>
            <WorkPicker
              exclude={exclude}
              onPick={(id) => setMemberIds((ids) => [...ids, id])}
            />
            <ul className="space-y-1">
              {memberIds.map((id, i) => {
                const w = worksById.get(id);
                const sn = w ? formatSeriesAndNumber(w) : "";
                return (
                <li key={id} className="flex items-start gap-2 text-sm">
                  <span className="flex-1 min-w-0 break-words py-1">
                    {w ? w.title : "(unknown work)"}
                    {sn && <span className="ml-1 text-muted-foreground">— {sn}</span>}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUpIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDownIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      setMemberIds((ids) => ids.filter((x) => x !== id))
                    }
                    aria-label="Remove"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </li>
                );
              })}
            </ul>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSave()}
            disabled={busy || !title.trim()}
          >
            {editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
