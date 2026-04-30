"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Heart, MessageCircle, Send, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";

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

export function PostCard({ post, currentUserId, canDelete, onDelete }: Props) {
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-200 flex-shrink-0 flex items-center justify-center">
            {author.photoUrl ? (
              <img src={author.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-stone-500">{authorInitials}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">
              {author.firstName} {author.lastName}
            </p>
            <p className="text-xs text-stone-400">{timeLabel(post.createdAt)}</p>
          </div>
        </div>
      </div>

      {post.title && (
        <p className="text-sm font-semibold text-stone-900">{post.title}</p>
      )}
      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          style={{ width:"300px", height:"auto", borderRadius:"10px", display:"block" }}
        />
      )}

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
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-stone-200 flex items-center justify-center flex-shrink-0">
                      {comment.user.photoUrl ? (
                        <img src={comment.user.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-stone-500">{commentInitials}</span>
                      )}
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
