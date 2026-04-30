"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Send } from "lucide-react";
import { PostCard } from "@/components/PostCard";

type FeedPost = {
  id: string;
  title?: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  _count?: { likes: number; comments: number; thumbsUp?: number; thumbsDown?: number };
  visibility?: Array<{ userId: string }>;
  profile: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
  };
};

type TrustUnit = {
  id: string;
  members: Array<{
    user: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
  }>;
};

function titleFor(unit: TrustUnit) {
  return unit.members
    .map((member) => `${member.user.firstName} ${member.user.lastName}`.trim())
    .join(" · ");
}

function sameMembers(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export function PrivateFeedClient({
  currentUserId,
  trustUnits,
  posts,
  initialUnitId,
}: {
  currentUserId: string;
  trustUnits: TrustUnit[];
  posts: FeedPost[];
  initialUnitId?: string;
}) {
  const [openUnitId, setOpenUnitId] = useState(
    trustUnits.some((unit) => unit.id === initialUnitId) ? initialUnitId! : trustUnits[0]?.id ?? ""
  );
  const [items, setItems] = useState(posts);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [submittingUnitId, setSubmittingUnitId] = useState<string | null>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const postsByUnit = useMemo(() => {
    return new Map(trustUnits.map((unit) => {
      const memberIds = unit.members.map((member) => member.user.id);
      const unitPosts = items.filter((post) =>
        sameMembers(post.visibility?.map((row) => row.userId) ?? [], memberIds)
      );
      return [unit.id, unitPosts];
    }));
  }, [items, trustUnits]);

  const handleDelete = async (postId: string) => {
    await fetch(`/api/profile/posts?postId=${postId}`, { method: "DELETE" });
    setItems((current) => current.filter((post) => post.id !== postId));
  };

  const handleImageSelect = (unitId: string, file: File) => {
    const existing = imagePreviews[unitId];
    if (existing) URL.revokeObjectURL(existing);
    setImageFiles((current) => ({ ...current, [unitId]: file }));
    setImagePreviews((current) => ({ ...current, [unitId]: URL.createObjectURL(file) }));
  };

  const clearImage = (unitId: string) => {
    const existing = imagePreviews[unitId];
    if (existing) URL.revokeObjectURL(existing);
    setImageFiles((current) => ({ ...current, [unitId]: null }));
    setImagePreviews((current) => {
      const next = { ...current };
      delete next[unitId];
      return next;
    });
    if (imageInputRefs.current[unitId]) imageInputRefs.current[unitId]!.value = "";
  };

  const handleSubmit = async (unit: TrustUnit) => {
    const body = drafts[unit.id]?.trim();
    if (!body) return;

    setSubmittingUnitId(unit.id);
    const visibleTo = unit.members.map((member) => member.user.id);
    const imageFile = imageFiles[unit.id];
    const imageUrl = imageUrls[unit.id]?.trim();
    let res: Response;

    if (imageFile) {
      const fd = new FormData();
      fd.append("body", body);
      fd.append("image", imageFile);
      if (imageUrl) fd.append("imageUrl", imageUrl);
      fd.append("visibleTo", JSON.stringify(visibleTo));
      res = await fetch("/api/profile/posts", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/profile/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, imageUrl: imageUrl || undefined, visibleTo }),
      });
    }

    if (res.ok) {
      const data = await res.json();
      setItems((current) => [{
        ...data.post,
        createdAt: new Date(data.post.createdAt).toISOString(),
        visibility: visibleTo.map((userId) => ({ userId })),
      }, ...current]);
      setDrafts((current) => ({ ...current, [unit.id]: "" }));
      setImageUrls((current) => ({ ...current, [unit.id]: "" }));
      clearImage(unit.id);
    }

    setSubmittingUnitId(null);
  };

  if (trustUnits.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-stone-900">No private Trust Unit feeds yet.</p>
        <p className="mt-2 text-sm text-stone-500">
          Private Feed opens once you have an active Trust Unit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trustUnits.map((unit) => {
        const open = openUnitId === unit.id;
        const unitPosts = postsByUnit.get(unit.id) ?? [];

        return (
          <section key={unit.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenUnitId(open ? "" : unit.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div>
                <p className="font-semibold text-stone-950">TU Private · {titleFor(unit)}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {unitPosts.length} private post{unitPosts.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-stone-500 transition-transform"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {open && (
              <div className="space-y-4 border-t border-stone-100 p-5">
                <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                  <textarea
                    value={drafts[unit.id] ?? ""}
                    onChange={(event) => setDrafts((current) => ({ ...current, [unit.id]: event.target.value }))}
                    placeholder="Start a private Trust Unit conversation..."
                    className="min-h-24 w-full resize-none rounded-xl border border-violet-100 bg-white p-3 text-sm outline-none focus:border-violet-300"
                  />
                  <input
                    value={imageUrls[unit.id] ?? ""}
                    onChange={(event) => setImageUrls((current) => ({ ...current, [unit.id]: event.target.value }))}
                    placeholder="Image URL (optional)"
                    className="mt-3 w-full rounded-xl border border-violet-100 bg-white p-3 text-sm outline-none focus:border-violet-300"
                  />
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {imagePreviews[unit.id] && (
                        <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-stone-100">
                          <img src={imagePreviews[unit.id]} alt="Selected attachment" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => clearImage(unit.id)}
                            className="absolute right-1 top-1 h-5 w-5 rounded-full bg-black/60 text-xs text-white"
                          >
                            x
                          </button>
                        </div>
                      )}
                      <input
                        ref={(element) => { imageInputRefs.current[unit.id] = element; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => event.target.files?.[0] && handleImageSelect(unit.id, event.target.files[0])}
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRefs.current[unit.id]?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Image
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubmit(unit)}
                      disabled={submittingUnitId === unit.id || !drafts[unit.id]?.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {submittingUnitId === unit.id ? "Posting..." : "Post to TU"}
                    </button>
                  </div>
                </div>

                {unitPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400">
                    No private conversation yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unitPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUserId={currentUserId}
                        canDelete={post.profile.user.id === currentUserId}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
