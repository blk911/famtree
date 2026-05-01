"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Send, Lock, Plus } from "lucide-react";
import { PostCard } from "@/components/PostCard";

// ── Types ────────────────────────────────────────────────────────────────────

type FeedPost = {
  id: string;
  title?: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  _count?: { likes: number; comments: number };
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

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

type ThreadType = "tu" | "direct" | "group";

type Thread = {
  key: string;           // sorted participant IDs joined by ","
  type: ThreadType;
  label: string;
  memberIds: string[];   // all participants including currentUser
  posts: FeedPost[];
  unit?: TrustUnit;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Canonical participant fingerprint: sorted union of visibility IDs + author ID */
function participantKey(visibilityIds: string[], authorId: string): string {
  const ids = new Set([...visibilityIds, authorId]);
  return Array.from(ids).sort().join(",");
}

function tuKey(unit: TrustUnit): string {
  return unit.members.map((m) => m.user.id).sort().join(",");
}

function buildThreads(
  items: FeedPost[],
  trustUnits: TrustUnit[],
  memberMap: Map<string, Member>,
  currentUserId: string,
): Thread[] {
  // Group posts by participant fingerprint
  const grouped = new Map<string, FeedPost[]>();
  for (const post of items) {
    const visIds = post.visibility?.map((v) => v.userId) ?? [];
    if (visIds.length === 0) continue; // public post — not a private thread
    const key = participantKey(visIds, post.profile.user.id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(post);
  }

  // TU threads first (show even if empty so users know they can compose)
  const tuThreads: Thread[] = trustUnits.map((unit) => {
    const key = tuKey(unit);
    const posts = grouped.get(key) ?? [];
    grouped.delete(key); // remove so it doesn't show up again as "group"
    return {
      key,
      type: "tu" as const,
      label: unit.members
        .map((m) => `${m.user.firstName} ${m.user.lastName}`)
        .join(" · "),
      memberIds: unit.members.map((m) => m.user.id),
      posts,
      unit,
    };
  });

  // Non-TU threads (direct or group)
  const otherThreads: Thread[] = [];
  grouped.forEach((threadPosts, key) => {
    const memberIds = key.split(",");
    const otherIds = memberIds.filter((id: string) => id !== currentUserId);
    const type: ThreadType = otherIds.length === 1 ? "direct" : "group";
    const label = otherIds
      .map((id: string) => {
        const m = memberMap.get(id);
        return m ? `${m.firstName} ${m.lastName}` : "Unknown";
      })
      .join(" · ");
    otherThreads.push({ key, type, label, memberIds, posts: threadPosts });
  });

  // Sort: TUs by post count desc; others by most-recent post desc
  tuThreads.sort((a, b) => b.posts.length - a.posts.length);
  otherThreads.sort((a, b) =>
    (b.posts[0]?.createdAt ?? "").localeCompare(a.posts[0]?.createdAt ?? "")
  );

  return [...tuThreads, ...otherThreads];
}

// ── Participant avatars (stacked circles) ─────────────────────────────────────

function ThreadAvatars({
  memberIds,
  memberMap,
  unit,
  currentUserId,
  type,
}: {
  memberIds: string[];
  memberMap: Map<string, Member>;
  unit?: TrustUnit;
  currentUserId: string;
  type: ThreadType;
}) {
  // For DM show the OTHER person. For TU/Group show up to 3 participants.
  const showIds =
    type === "direct"
      ? memberIds.filter((id) => id !== currentUserId).slice(0, 1)
      : memberIds.slice(0, 3);

  const people = showIds.map((id) => {
    if (unit) {
      const m = unit.members.find((m) => m.user.id === id);
      if (m) return m.user;
    }
    return memberMap.get(id) ?? null;
  }).filter(Boolean) as Member[];

  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
      {people.map((p, i) => {
        const ini = `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
        return (
          <div
            key={p.id}
            title={`${p.firstName} ${p.lastName}`}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              overflow: "hidden", border: "2px solid white",
              background: "#e7e5e4", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 700, color: "#78716c",
              marginLeft: i > 0 ? -8 : 0,
              position: "relative",
            }}
          >
            {p.photoUrl ? (
              <img
                src={p.photoUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fb = e.currentTarget.nextSibling as HTMLElement;
                  if (fb) fb.style.display = "flex";
                }}
              />
            ) : null}
            <span
              style={{
                position: "absolute", inset: 0,
                display: p.photoUrl ? "none" : "flex",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {ini}
            </span>
          </div>
        );
      })}
      {type !== "direct" && memberIds.length > 3 && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", border: "2px solid white",
          background: "#d6d3d1", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "10px", fontWeight: 700,
          color: "#78716c", marginLeft: -8, flexShrink: 0,
        }}>
          +{memberIds.length - 3}
        </div>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const BADGE: Record<ThreadType, { label: string; bg: string; color: string }> = {
  tu:     { label: "TU",    bg: "#ede9fe", color: "#7c3aed" },
  direct: { label: "DM",    bg: "#dbeafe", color: "#1d4ed8" },
  group:  { label: "GROUP", bg: "#dcfce7", color: "#15803d" },
};

function TypeBadge({ type }: { type: ThreadType }) {
  const { label, bg, color } = BADGE[type];
  return (
    <span style={{
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: "999px", background: bg, color,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

// ── Compose box per thread ─────────────────────────────────────────────────────

const COMPOSE_BG: Record<ThreadType, { bg: string; border: string }> = {
  tu:     { bg: "#faf5ff", border: "#e9d5ff" },
  direct: { bg: "#eff6ff", border: "#bfdbfe" },
  group:  { bg: "#f0fdf4", border: "#bbf7d0" },
};

// ── Main component ────────────────────────────────────────────────────────────

export function PrivateFeedClient({
  currentUserId,
  trustUnits,
  posts,
  members,
  initialUnitId,
}: {
  currentUserId: string;
  trustUnits: TrustUnit[];
  posts: FeedPost[];
  members: Member[];
  initialUnitId?: string;
}) {
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  const otherMembers = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId]
  );

  // Live post items (mutated by send/delete)
  const [allItems, setAllItems] = useState<FeedPost[]>(posts);

  // Derive threads from live items
  const threads = useMemo(
    () => buildThreads(allItems, trustUnits, memberMap, currentUserId),
    [allItems, trustUnits, memberMap, currentUserId]
  );

  // Which thread is open (accordion — one at a time)
  const [openKey, setOpenKey] = useState<string>(() => {
    if (initialUnitId) {
      const tu = trustUnits.find((u) => u.id === initialUnitId);
      if (tu) return tuKey(tu);
    }
    return trustUnits.length > 0 ? tuKey(trustUnits[0]) : "";
  });

  // Per-thread compose state
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // New DM composer state
  const [newDmOpen, setNewDmOpen] = useState(false);
  const [newDmTo, setNewDmTo] = useState<string[]>([]);
  const [newDmBody, setNewDmBody] = useState("");
  const [newDmSubmitting, setNewDmSubmitting] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDelete = async (postId: string) => {
    await fetch(`/api/profile/posts?postId=${postId}`, { method: "DELETE" });
    setAllItems((cur) => cur.filter((p) => p.id !== postId));
  };

  const handleImageSelect = (key: string, file: File) => {
    const prev = imagePreviews[key];
    if (prev) URL.revokeObjectURL(prev);
    setImageFiles((c) => ({ ...c, [key]: file }));
    setImagePreviews((c) => ({ ...c, [key]: URL.createObjectURL(file) }));
  };

  const clearImage = (key: string) => {
    const prev = imagePreviews[key];
    if (prev) URL.revokeObjectURL(prev);
    setImageFiles((c) => ({ ...c, [key]: null }));
    setImagePreviews((c) => { const n = { ...c }; delete n[key]; return n; });
    if (imageInputRefs.current[key]) imageInputRefs.current[key]!.value = "";
  };

  const postToThread = async (visibleTo: string[], body: string, imageFile?: File | null): Promise<FeedPost | null> => {
    let res: Response;
    if (imageFile) {
      const fd = new FormData();
      fd.append("body", body);
      fd.append("image", imageFile);
      fd.append("visibleTo", JSON.stringify(visibleTo));
      res = await fetch("/api/profile/posts", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/profile/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, visibleTo }),
      });
    }
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ...data.post,
      createdAt: new Date(data.post.createdAt).toISOString(),
      visibility: visibleTo.map((userId) => ({ userId })),
    };
  };

  const handleSubmit = async (thread: Thread) => {
    const body = drafts[thread.key]?.trim();
    if (!body || submitting === thread.key) return;
    setSubmitting(thread.key);
    // visibleTo = all participants except self (self is the post author)
    const visibleTo = thread.memberIds.filter((id) => id !== currentUserId);
    const newPost = await postToThread(visibleTo, body, imageFiles[thread.key]);
    if (newPost) {
      setAllItems((cur) => [newPost, ...cur]);
      setDrafts((c) => ({ ...c, [thread.key]: "" }));
      clearImage(thread.key);
    }
    setSubmitting(null);
  };

  const handleNewDm = async () => {
    if (!newDmBody.trim() || newDmTo.length === 0 || newDmSubmitting) return;
    setNewDmSubmitting(true);
    const newPost = await postToThread(newDmTo, newDmBody.trim());
    if (newPost) {
      setAllItems((cur) => [newPost, ...cur]);
      // Open the thread that was just created
      const key = participantKey(newDmTo, currentUserId);
      setOpenKey(key);
      setNewDmBody("");
      setNewDmTo([]);
      setNewDmOpen(false);
    }
    setNewDmSubmitting(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasTUs = trustUnits.length > 0;
  const hasThreads = threads.length > 0;

  return (
    <div className="space-y-3">

      {/* ── New DM / Group composer ─────────────────────────────────────────── */}
      {otherMembers.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <button
            type="button"
            onClick={() => setNewDmOpen((v) => !v)}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-stone-50 transition-colors"
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#f5f4f0", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Plus style={{ width: 14, height: 14, color: "#78716c" }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#44403c" }}>
              New private message
            </span>
            <ChevronDown
              className="ml-auto h-4 w-4 text-stone-400 transition-transform"
              style={{ transform: newDmOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {newDmOpen && (
            <div className="border-t border-stone-100 p-4 space-y-3">
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#78716c", marginBottom: "8px" }}>
                  Send to:
                </p>
                <div className="flex flex-wrap gap-2">
                  {otherMembers.map((m) => {
                    const sel = newDmTo.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setNewDmTo((prev) =>
                            sel ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          )
                        }
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "4px 10px 4px 6px", borderRadius: "999px",
                          fontSize: "13px", fontWeight: 600, cursor: "pointer",
                          border: sel ? "none" : "1px solid #e7e5e4",
                          background: sel ? "#1c1917" : "white",
                          color: sel ? "white" : "#44403c",
                          transition: "all 0.12s",
                        }}
                      >
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: sel ? "rgba(255,255,255,0.2)" : "#e7e5e4",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "9px", fontWeight: 800, color: sel ? "white" : "#78716c",
                          }}>
                            {m.firstName[0]}{m.lastName[0]}
                          </div>
                        )}
                        {m.firstName} {m.lastName}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                value={newDmBody}
                onChange={(e) => setNewDmBody(e.target.value)}
                placeholder="Write your message…"
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNewDm}
                  disabled={newDmSubmitting || !newDmBody.trim() || newDmTo.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                  {newDmSubmitting ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!hasThreads && !hasTUs && (
        <div className="rounded-2xl border border-dashed border-stone-200 py-14 text-center">
          <Lock style={{ width: 36, height: 36, margin: "0 auto 12px", color: "#d6d3d1" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#78716c" }}>No private threads yet.</p>
          <p style={{ fontSize: "13px", color: "#a8a29e", marginTop: "4px" }}>
            Start a message above, or form a Trust Unit with a family member.
          </p>
        </div>
      )}

      {/* ── Thread list ─────────────────────────────────────────────────────── */}
      {threads.map((thread) => {
        const open = openKey === thread.key;
        const lastPost = thread.posts[0];
        const preview = lastPost
          ? lastPost.body.length > 70
            ? lastPost.body.slice(0, 70) + "…"
            : lastPost.body
          : null;
        const { bg, border } = COMPOSE_BG[thread.type];

        return (
          <section
            key={thread.key}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
          >
            {/* ── Header (always visible) ─────────────────────────────────── */}
            <button
              type="button"
              onClick={() => setOpenKey(open ? "" : thread.key)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ThreadAvatars
                  memberIds={thread.memberIds}
                  memberMap={memberMap}
                  unit={thread.unit}
                  currentUserId={currentUserId}
                  type={thread.type}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={thread.type} />
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#1c1917" }} className="truncate">
                      {thread.label}
                    </p>
                  </div>
                  {preview && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{preview}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {thread.posts.length > 0 && (
                  <span style={{
                    fontSize: "11px", fontWeight: 600, color: "#78716c",
                    background: "#f5f4f0", padding: "2px 8px", borderRadius: "999px",
                  }}>
                    {thread.posts.length}
                  </span>
                )}
                <ChevronDown
                  className="h-4 w-4 text-stone-400 transition-transform"
                  style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </div>
            </button>

            {/* ── Expanded body ────────────────────────────────────────────── */}
            {open && (
              <div className="border-t border-stone-100 p-5 space-y-4">

                {/* Compose */}
                <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: "16px", padding: "14px" }}>
                  <textarea
                    value={drafts[thread.key] ?? ""}
                    onChange={(e) =>
                      setDrafts((c) => ({ ...c, [thread.key]: e.target.value }))
                    }
                    placeholder={
                      thread.type === "tu"
                        ? `Message Trust Unit · ${thread.label}…`
                        : `Message ${thread.label}…`
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl bg-white px-3 py-2 text-sm outline-none"
                    style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {imagePreviews[thread.key] && (
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-stone-100">
                          <img src={imagePreviews[thread.key]} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => clearImage(thread.key)}
                            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                            style={{ fontSize: "12px" }}
                          >
                            ×
                          </button>
                        </div>
                      )}
                      <input
                        ref={(el) => { imageInputRefs.current[thread.key] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] && handleImageSelect(thread.key, e.target.files[0])
                        }
                      />
                      <button
                        type="button"
                        onClick={() => imageInputRefs.current[thread.key]?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Image
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubmit(thread)}
                      disabled={submitting === thread.key || !drafts[thread.key]?.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submitting === thread.key ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>

                {/* Posts */}
                {thread.posts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400">
                    No messages yet — start the conversation!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {thread.posts.map((post) => (
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
