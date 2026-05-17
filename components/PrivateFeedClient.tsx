"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Send, Lock, Plus } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { directThreadKey } from "@/lib/private-thread-keys";
import { postScopeShareLabel } from "@/lib/posts/scope-labels";
import { checkBrowserPostMediaFile } from "@/lib/media/image-sniff";
import { BROWSER_POST_MEDIA_ACCEPT } from "@/lib/media/upload-limits";
import { preparePostMediaForSubmit } from "@/lib/posts/upload-post-media-client";

// ── Types ────────────────────────────────────────────────────────────────────

type FeedPost = {
  id: string;
  title?: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  scope?: string | null;
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
  bondPeers: Member[],
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

  const merged = [...tuThreads, ...otherThreads];
  const keys = new Set(merged.map((t) => t.key));
  const seeded: Thread[] = [];
  for (const peer of bondPeers) {
    const key = directThreadKey(peer.id, currentUserId);
    if (keys.has(key)) continue;
    keys.add(key);
    seeded.push({
      key,
      type: "direct",
      label: `${peer.firstName} ${peer.lastName}`,
      memberIds: key.split(","),
      posts: [],
    });
  }
  seeded.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );

  return [...merged, ...seeded];
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

type OrchestrationBadgeKind = "DM" | "PRIVATE" | "FAMILY" | "BUSINESS" | "CHURCH" | "CLUB" | "VAULT";

function orchestrationBadgeForThread(thread: Thread): OrchestrationBadgeKind {
  if (thread.type === "direct") return "DM";
  if (thread.type === "group") return "PRIVATE";
  return "VAULT";
}

function unreadCountForThread(
  thread: Thread,
  currentUserId: string,
  lastSeen: Date | null
): number {
  if (!lastSeen || Number.isNaN(lastSeen.getTime())) return 0;
  return thread.posts.filter(
    (p) => new Date(p.createdAt) > lastSeen && p.profile.user.id !== currentUserId
  ).length;
}

const ORCH_BADGE_STYLE: Record<
  OrchestrationBadgeKind,
  { label: string; bg: string; color: string }
> = {
  DM:       { label: "DM",       bg: "rgba(219,234,254,0.72)", color: "#1d4ed8" },
  PRIVATE:  { label: "PRIVATE",  bg: "rgba(245,245,244,0.95)", color: "#57534e" },
  FAMILY:   { label: "FAMILY",   bg: "rgba(254,243,199,0.75)", color: "#b45309" },
  BUSINESS: { label: "BUSINESS", bg: "rgba(243,232,255,0.82)", color: "#7c3aed" },
  CHURCH:   { label: "CHURCH",   bg: "rgba(224,231,255,0.78)", color: "#4338ca" },
  CLUB:     { label: "CLUB",     bg: "rgba(209,250,229,0.72)", color: "#047857" },
  VAULT:    { label: "VAULT",    bg: "rgba(237,233,254,0.82)", color: "#6d28d9" },
};

function OrchestrationBadge({ kind }: { kind: OrchestrationBadgeKind }) {
  const { label, bg, color } = ORCH_BADGE_STYLE[kind];
  return (
    <span
      style={{
        fontSize:      "9px",
        fontWeight:    700,
        letterSpacing: "0.07em",
        padding:       "2px 7px",
        borderRadius:  "999px",
        background:    bg,
        color,
        flexShrink:    0,
      }}
    >
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
  bondPeers,
  initialUnitId,
  initialPeerId,
  lastSeenAt = null,
}: {
  currentUserId: string;
  trustUnits: TrustUnit[];
  posts: FeedPost[];
  members: Member[];
  bondPeers: Member[];
  initialUnitId?: string;
  initialPeerId?: string;
  /** ISO timestamp — used for “new since last visit” counts in the thread rail. */
  lastSeenAt?: string | null;
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
    () =>
      buildThreads(allItems, trustUnits, memberMap, currentUserId, bondPeers),
    [allItems, trustUnits, memberMap, currentUserId, bondPeers],
  );

  const lastSeenDate = useMemo(
    () => (lastSeenAt != null && lastSeenAt !== "" ? new Date(lastSeenAt) : null),
    [lastSeenAt]
  );

  const sortedThreads = useMemo(() => {
    const copy = [...threads];
    copy.sort((a, b) => {
      const ta = a.posts[0]?.createdAt ?? "";
      const tb = b.posts[0]?.createdAt ?? "";
      if (ta !== tb) return tb.localeCompare(ta);
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
    return copy;
  }, [threads]);

  // Which thread is active in the center panel (participant fingerprint key)
  /** Active private thread = participant fingerprint (`directThreadKey` or sorted TU member ids). */
  const [openKey, setOpenKey] = useState<string>("");
  const [didApplyDeepLink, setDidApplyDeepLink] = useState(false);

  useEffect(() => {
    if (didApplyDeepLink) return;
    if (initialPeerId) {
      const k = directThreadKey(initialPeerId, currentUserId);
      if (threads.some((t) => t.key === k)) {
        setOpenKey(k);
        setDidApplyDeepLink(true);
        return;
      }
    }
    if (initialUnitId) {
      const tu = trustUnits.find((u) => u.id === initialUnitId);
      if (tu) {
        setOpenKey(tuKey(tu));
        setDidApplyDeepLink(true);
        return;
      }
    }
    if (trustUnits.length > 0) {
      setOpenKey(tuKey(trustUnits[0]));
    } else if (threads.length > 0) {
      setOpenKey(threads[0].key);
    }
    setDidApplyDeepLink(true);
  }, [
    threads,
    trustUnits,
    initialPeerId,
    initialUnitId,
    currentUserId,
    didApplyDeepLink,
  ]);

  useEffect(() => {
    if (!didApplyDeepLink) return;
    if (sortedThreads.length === 0) return;
    if (openKey && sortedThreads.some((t) => t.key === openKey)) return;
    setOpenKey(sortedThreads[0].key);
  }, [didApplyDeepLink, sortedThreads, openKey]);

  // Per-thread compose state
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
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
    void (async () => {
      const r = await checkBrowserPostMediaFile(file);
      if (!r.ok) {
        setMediaErrors((c) => ({ ...c, [key]: r.error }));
        return;
      }
      setMediaErrors((c) => {
        const n = { ...c };
        delete n[key];
        return n;
      });
      const prev = imagePreviews[key];
      if (prev) URL.revokeObjectURL(prev);
      setImageFiles((c) => ({ ...c, [key]: file }));
      setImagePreviews((c) => ({ ...c, [key]: URL.createObjectURL(file) }));
    })();
  };

  const clearImage = (key: string) => {
    const prev = imagePreviews[key];
    if (prev) URL.revokeObjectURL(prev);
    setImageFiles((c) => ({ ...c, [key]: null }));
    setImagePreviews((c) => { const n = { ...c }; delete n[key]; return n; });
    setMediaErrors((c) => {
      const n = { ...c };
      delete n[key];
      return n;
    });
    if (imageInputRefs.current[key]) imageInputRefs.current[key]!.value = "";
  };

  const postToThread = async (visibleTo: string[], body: string, imageFile?: File | null): Promise<FeedPost | null> => {
    let blobAttachmentUrl: string | undefined;
    let multipartFile: File | null | undefined = imageFile ?? null;

    if (multipartFile) {
      try {
        const prepared = await preparePostMediaForSubmit(multipartFile);
        if (prepared.kind === "blob") {
          blobAttachmentUrl = prepared.url;
          multipartFile = null;
        }
      } catch {
        return null;
      }
    }

    const resolvedImageUrl = (blobAttachmentUrl ?? "").trim() || undefined;

    let res: Response;
    if (multipartFile) {
      const fd = new FormData();
      fd.append("body", body);
      fd.append("scope", "PRIVATE");
      fd.append("image", multipartFile);
      fd.append("visibleTo", JSON.stringify(visibleTo));
      res = await fetch("/api/profile/posts", { method: "POST", body: fd });
    } else {
      res = await fetch("/api/profile/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          visibleTo,
          scope: "PRIVATE",
          ...(resolvedImageUrl ? { imageUrl: resolvedImageUrl } : {}),
        }),
      });
    }
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.post as FeedPost;
    return {
      ...raw,
      createdAt: new Date(raw.createdAt).toISOString(),
      visibility: raw.visibility ?? visibleTo.map((userId) => ({ userId })),
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
  const activeThread = sortedThreads.find((t) => t.key === openKey) ?? null;

  function previewLine(thread: Thread): string | null {
    const lastPost = thread.posts[0];
    if (!lastPost) return null;
    return lastPost.body.length > 56 ? `${lastPost.body.slice(0, 56)}…` : lastPost.body;
  }

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

      {/* ── Empty state (no threads / trust units to show) ───────────────────── */}
      {!hasThreads && !hasTUs && (
        <div className="rounded-2xl border border-dashed border-stone-200 py-14 text-center">
          <Lock style={{ width: 36, height: 36, margin: "0 auto 12px", color: "#d6d3d1" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#78716c" }}>
            No active private threads yet.
          </p>
          <p style={{ fontSize: "13px", color: "#a8a29e", marginTop: "6px", maxWidth: 360, marginInline: "auto", lineHeight: 1.5 }}>
            Start a direct conversation or connect with your network.
          </p>
        </div>
      )}

      {/* ── Center thread + right orchestration rail ────────────────────────── */}
      {(hasThreads || hasTUs) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_276px] lg:items-start">
          <div className="min-w-0 space-y-3 order-2 lg:order-1">
            {!activeThread ? (
              <div className="rounded-2xl border border-dashed border-stone-200 py-12 text-center text-sm text-stone-500">
                Select a thread from the list to open the conversation.
              </div>
            ) : (
              (() => {
                const thread = activeThread;
                const { bg, border } = COMPOSE_BG[thread.type];
                return (
                  <section
                    key={thread.key}
                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 px-5 py-4">
                      <ThreadAvatars
                        memberIds={thread.memberIds}
                        memberMap={memberMap}
                        unit={thread.unit}
                        currentUserId={currentUserId}
                        type={thread.type}
                      />
                      <OrchestrationBadge kind={orchestrationBadgeForThread(thread)} />
                      <p
                        className="min-w-0 flex-1 truncate text-sm font-bold text-stone-900"
                        title={thread.label}
                      >
                        {thread.label}
                      </p>
                    </div>

                    <div className="space-y-4 p-5">
                      <div
                        style={{
                          background: bg,
                          border:      `1px solid ${border}`,
                          borderRadius: "16px",
                          padding:     "14px",
                        }}
                      >
                        {mediaErrors[thread.key] ? (
                          <div className="mb-2 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5 text-xs text-red-700">
                            {mediaErrors[thread.key]}
                          </div>
                        ) : null}
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
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {imagePreviews[thread.key] && (
                              <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-stone-100">
                                {imageFiles[thread.key]?.type.startsWith("video/") ? (
                                  <video
                                    src={imagePreviews[thread.key]}
                                    muted
                                    playsInline
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <img src={imagePreviews[thread.key]} alt="" className="h-full w-full object-cover" />
                                )}
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
                              ref={(el) => {
                                imageInputRefs.current[thread.key] = el;
                              }}
                              type="file"
                              accept={BROWSER_POST_MEDIA_ACCEPT}
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
                              Photo / video
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSubmit(thread)}
                            disabled={submitting === thread.key || !drafts[thread.key]?.trim()}
                            className="inline-flex items-center gap-2 rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {submitting === thread.key ? "Sending…" : "Send"}
                          </button>
                        </div>
                      </div>

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
                              shareScope={postScopeShareLabel(post.scope ?? "PRIVATE")}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()
            )}
          </div>

          <aside className="order-1 rounded-2xl border border-stone-200 bg-[#fafaf9] p-2 lg:order-2 lg:sticky lg:top-4 lg:max-h-[min(72vh,620px)] lg:overflow-y-auto">
            <div
              className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-stone-400"
              style={{ letterSpacing: "0.08em" }}
            >
              Private threads
            </div>
            <div className="flex flex-col gap-1">
              {sortedThreads.map((thread) => {
                const selected = openKey === thread.key;
                const unread = unreadCountForThread(thread, currentUserId, lastSeenDate);
                const pv = previewLine(thread);
                return (
                  <button
                    key={thread.key}
                    type="button"
                    onClick={() => setOpenKey(thread.key)}
                    className={`w-full rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                      selected
                        ? "bg-white shadow-sm ring-1 ring-stone-200"
                        : "hover:bg-stone-100/90"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <ThreadAvatars
                        memberIds={thread.memberIds}
                        memberMap={memberMap}
                        unit={thread.unit}
                        currentUserId={currentUserId}
                        type={thread.type}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <OrchestrationBadge kind={orchestrationBadgeForThread(thread)} />
                          <span className="truncate text-[13px] font-semibold text-stone-900">
                            {thread.label}
                          </span>
                        </div>
                        {pv ? (
                          <p className="mt-0.5 truncate text-[11px] leading-snug text-stone-500">{pv}</p>
                        ) : null}
                      </div>
                      {unread > 0 ? (
                        <span
                          className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white"
                          aria-label={`${unread} unread`}
                        >
                          {unread > 99 ? "99+" : unread}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
