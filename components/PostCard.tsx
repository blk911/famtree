"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Archive, Heart, MessageCircle, Send, ThumbsDown, ThumbsUp, Trash2, Users } from "lucide-react";
import { isVideoAttachmentUrl } from "@/lib/media/upload-limits";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
};

type Post = {
  id: string;
  title?: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  scope?: string | null;
  _count?: { likes: number; comments: number; thumbsUp?: number; thumbsDown?: number };
  profile: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
    };
  };
};

type Props = {
  post: Post;
  currentUserId: string;
  canDelete: boolean;
  onDelete?: (postId: string) => void;
  /** When set, shows a scope label instead of listing private recipients. */
  shareScope?: string;
  /** Private-thread recipients (omit when using shareScope). */
  privateRecipients?: Array<{ id: string; displayName: string }>;
};

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function timeLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PrivateRecipientsInline({ people }: { people: Array<{ id: string; displayName: string }> }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);
  const summary = people.map((p) => p.displayName).join(", ");

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [summary]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopoverOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popoverOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDoc = (e: MouseEvent) => {
      const root = wrapRef.current;
      if (root && !root.contains(e.target as Node)) setPopoverOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen]);

  const showMoreControl = truncated || people.length > 4;

  return (
    <div
      ref={wrapRef}
      className="relative flex max-w-[min(100%,280px)] flex-shrink-0 flex-col items-end gap-1 text-right min-[480px]:max-w-[340px]"
    >
      <div className="flex items-start justify-end gap-1">
        <div
          ref={textRef}
          className="text-xs leading-snug text-stone-500"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
          title={summary}
        >
          <span className="font-semibold text-stone-600">With </span>
          {summary}
        </div>
        {showMoreControl && (
          <button
            type="button"
            className="flex-shrink-0 rounded px-1 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
            aria-expanded={popoverOpen}
            aria-haspopup="dialog"
            title="All recipients"
            onClick={(e) => {
              e.stopPropagation();
              setPopoverOpen((v) => !v);
            }}
          >
            more…
          </button>
        )}
      </div>

      {popoverOpen && (
        <div
          role="dialog"
          aria-label="Conversation recipients"
          className="absolute right-0 top-full z-30 mt-1 min-w-[200px] max-w-[min(calc(100vw-32px),280px)] rounded-xl border border-stone-200 bg-white py-2 shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 border-b border-stone-100 px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-stone-500">
            <Users className="h-3.5 w-3.5" aria-hidden />
            In this thread
          </div>
          <ul className="max-h-48 overflow-y-auto px-3 pt-2 text-sm text-stone-700">
            {people.map((p) => (
              <li key={p.id} className="py-1 leading-snug">
                {p.displayName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PostCard({ post, currentUserId, canDelete, onDelete, privateRecipients, shareScope }: Props) {
  const author = post.profile.user;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [thumbUp, setThumbUp] = useState(false);
  const [thumbUpCount, setThumbUpCount] = useState(post._count?.thumbsUp ?? 0);
  const [thumbDown, setThumbDown] = useState(false);
  const [thumbDownCount, setThumbDownCount] = useState(post._count?.thumbsDown ?? 0);
  const [archived, setArchived] = useState(false);
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const authorInitials = useMemo(() => initials(author.firstName, author.lastName), [author.firstName, author.lastName]);

  const actionButtonStyle = (color = "#a8a29e") => ({
    display:"flex",alignItems:"center",gap:"5px",fontSize:"13px",fontWeight:500,
    background:"none",border:"none",cursor:"pointer",padding:"4px 0",transition:"color 0.1s",color,
  });

  const controlButtonStyle = (color = "#a8a29e") => ({
    display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",fontWeight:500,color,
    background:"none",border:"none",cursor:"pointer",padding:"4px 8px",
    borderRadius:"6px",transition:"all 0.1s",
  });

  useEffect(() => {
    fetch(`/api/posts/${post.id}/likes`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        setLiked(data.liked);
        setLikeCount(data.count);
      })
      .catch(() => null);
  }, [post.id, currentUserId]);

  // Like toggle — optimistic update, syncs with server
  const handleToggleLike = async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => count + (nextLiked ? 1 : -1));

    try {
      const res = await fetch(`/api/posts/${post.id}/likes`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error("LIKE_FAILED");
      setLiked(data.liked);
      setLikeCount(data.count);
    } catch {
      setLiked(!nextLiked);
      setLikeCount((count) => count + (nextLiked ? -1 : 1));
    }
  };

  const handleToggleThumbUp = () => {
    const nextThumbUp = !thumbUp;
    setThumbUp(nextThumbUp);
    setThumbUpCount((count) => count + (nextThumbUp ? 1 : -1));

    if (nextThumbUp && thumbDown) {
      setThumbDown(false);
      setThumbDownCount((count) => Math.max(0, count - 1));
    }
  };

  const handleToggleThumbDown = () => {
    const nextThumbDown = !thumbDown;
    setThumbDown(nextThumbDown);
    setThumbDownCount((count) => count + (nextThumbDown ? 1 : -1));

    if (nextThumbDown && thumbUp) {
      setThumbUp(false);
      setThumbUpCount((count) => Math.max(0, count - 1));
    }
  };

  // Comment thread — lazy loaded on first expand
  const handleToggleComments = async () => {
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);

    if (!nextOpen || commentsLoaded) return;

    const res = await fetch(`/api/posts/${post.id}/comments`);
    if (!res.ok) return;
    const data = await res.json();
    setComments(data.comments ?? []);
    setCommentsLoaded(true);
  };

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) return;

    setCommentSubmitting(true);
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();

    if (res.ok) {
      setComments((items) => [...items, data.comment].slice(-10));
      setCommentCount((count) => count + 1);
      setCommentBody("");
      setCommentsLoaded(true);
      setCommentsOpen(true);
    }

    setCommentSubmitting(false);
  };

  return (
    <div className="post-card group" style={{background:archived ? "rgba(245,158,11,0.04)" : undefined}}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-200 flex-shrink-0 flex items-center justify-center relative">
            {author.photoUrl ? (
              <img
                src={author.photoUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <span
              className="text-xs font-bold text-stone-500 absolute inset-0 flex items-center justify-center"
              style={{ display: author.photoUrl ? "none" : "flex" }}
            >
              {authorInitials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-900">
              {author.firstName} {author.lastName}
            </p>
            <p className="text-xs text-stone-400">{timeLabel(post.createdAt)}</p>
          </div>
        </div>
        {shareScope ? (
          <span className="max-w-[min(100%,240px)] text-right text-xs font-semibold text-violet-800">{shareScope}</span>
        ) : privateRecipients && privateRecipients.length > 0 ? (
          <PrivateRecipientsInline people={privateRecipients} />
        ) : null}
      </div>

      {post.title && (
        <p className="text-sm font-semibold text-stone-900">{post.title}</p>
      )}
      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      {post.imageUrl &&
        (isVideoAttachmentUrl(post.imageUrl) ? (
          <video
            src={post.imageUrl}
            controls
            playsInline
            style={{
              width: "300px",
              maxWidth: "100%",
              height: "auto",
              borderRadius: "10px",
              display: "block",
            }}
          />
        ) : (
          <img
            src={post.imageUrl}
            alt=""
            style={{ width: "300px", height: "auto", borderRadius: "10px", display: "block", maxWidth: "100%" }}
          />
        ))}

      {/* // Action bar — left: reactions (like, thumbs up/down, comments) | right: archive + delete (own posts only) */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #f5f4f0",paddingTop:"12px",marginTop:"4px",gap:"16px",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"18px",alignItems:"center"}}>
          <button onClick={handleToggleThumbUp} title="Thumbs up" style={actionButtonStyle(thumbUp ? "#2563eb" : "#a8a29e")}>
            <ThumbsUp className="w-4 h-4" style={{fill:thumbUp ? "#2563eb" : "none"}} />
            {thumbUpCount > 0 && <span>{thumbUpCount}</span>}
          </button>
          <button onClick={handleToggleThumbDown} title="Thumbs down" style={actionButtonStyle(thumbDown ? "#dc2626" : "#a8a29e")}>
            <ThumbsDown className="w-4 h-4" style={{fill:thumbDown ? "#dc2626" : "none"}} />
            {thumbDownCount > 0 && <span>{thumbDownCount}</span>}
          </button>
          <button onClick={handleToggleLike} title="Like" style={actionButtonStyle(liked ? "#f43f5e" : "#a8a29e")}>
            <Heart className="w-4 h-4" fill={liked ? "#f43f5e" : "none"} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button onClick={handleToggleComments} title="Comments" style={actionButtonStyle("#a8a29e")}>
            <MessageCircle className="w-4 h-4" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
        </div>

        {canDelete && (
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <button
              onClick={() => setArchived((value) => !value)}
              title={archived ? "Archived" : "Archive"}
              style={controlButtonStyle(archived ? "#f59e0b" : "#a8a29e")}
              onMouseEnter={(e) => { e.currentTarget.style.background="#f5f4f0"; if (!archived) e.currentTarget.style.color="#78716c"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background="none"; e.currentTarget.style.color=archived?"#f59e0b":"#a8a29e"; }}
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(post.id)}
              title="Delete"
              style={controlButtonStyle("#a8a29e")}
              onMouseEnter={(e) => { e.currentTarget.style.background="#f5f4f0"; e.currentTarget.style.color="#dc2626"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background="none"; e.currentTarget.style.color="#a8a29e"; }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {commentsOpen && (
        <div className="space-y-3 border-t border-stone-100 pt-3">
          {comments.length > 0 && (
            <div className="space-y-3">
              {comments.slice(-10).map((comment) => {
                const commentInitials = initials(comment.user.firstName, comment.user.lastName);
                return (
                  <div key={comment.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-stone-200 flex items-center justify-center flex-shrink-0 relative">
                      {comment.user.photoUrl ? (
                        <img
                          src={comment.user.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextSibling as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <span
                        className="text-[10px] font-bold text-stone-500 absolute inset-0 flex items-center justify-center"
                        style={{ display: comment.user.photoUrl ? "none" : "flex" }}
                      >
                        {commentInitials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-xl bg-stone-50 px-3 py-2">
                        <p className="text-[13px] font-bold text-stone-900">
                          {comment.user.firstName} {comment.user.lastName}
                        </p>
                        <p className="text-[13px] text-stone-700 leading-relaxed">{comment.body}</p>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        {new Date(comment.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              className="field-input text-sm flex-1"
              placeholder="Write a comment..."
              value={commentBody}
              maxLength={500}
              onChange={(event) => setCommentBody(event.target.value)}
            />
            <button
              type="submit"
              disabled={commentSubmitting || !commentBody.trim()}
              className="btn-primary text-xs px-3 py-2 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Reply
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
