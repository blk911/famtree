"use client";

import { useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Plus, X } from "lucide-react";
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

const tabs = [
  { key: "all", label: "All Posts" },
  { key: "mine", label: "My Posts" },
  { key: "linked", label: "Linked to Me" },
] as const;

type TabKey = typeof tabs[number]["key"];

export function FamilyFeedClient({ currentUserId, posts }: { currentUserId: string; posts: FeedPost[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [items, setItems] = useState(posts);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const visiblePosts = useMemo(() => {
    if (activeTab === "mine") {
      return items.filter((post) => post.profile.user.id === currentUserId);
    }

    if (activeTab === "linked") {
      return items.filter((post) => post.visibility?.some((row) => row.userId === currentUserId));
    }

    return items;
  }, [activeTab, currentUserId, items]);

  const handleDelete = async (postId: string) => {
    await fetch(`/api/profile/posts?postId=${postId}`, { method: "DELETE" });
    setItems((current) => current.filter((post) => post.id !== postId));
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const resetComposer = () => {
    setTitle("");
    setBody("");
    setImageUrl("");
    clearImage();
  };

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      let res: Response;
      if (imageFile) {
        const formData = new FormData();
        if (title.trim()) formData.append("title", title.trim());
        formData.append("body", body.trim());
        formData.append("image", imageFile);
        if (imageUrl.trim()) formData.append("imageUrl", imageUrl.trim());
        res = await fetch("/api/profile/posts", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/profile/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || undefined,
            body: body.trim(),
            imageUrl: imageUrl.trim() || undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not create post");
        return;
      }

      setItems((current) => [{
        ...data.post,
        createdAt: new Date(data.post.createdAt).toISOString(),
        visibility: [],
      }, ...current]);
      setActiveTab("all");
      resetComposer();
      setComposerOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Could not create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3 border-b border-stone-200">
        <button
          type="button"
          onClick={() => setComposerOpen((value) => !value)}
          className={`mb-[-1px] inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            composerOpen
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Plus className="h-4 w-4" />
          Post
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {composerOpen && (
        <form onSubmit={handleCreatePost} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          {error && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              placeholder="Title (optional)"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Share something with your family..."
              className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Image URL (optional)"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {imagePreview && (
                <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-stone-100">
                  <img src={imagePreview} alt="Selected attachment" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => event.target.files?.[0] && handleImageSelect(event.target.files[0])}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
              >
                <ImageIcon className="h-4 w-4" />
                Image
              </button>
            </div>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      )}

      {visiblePosts.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">
          No posts here yet.
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => (
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
  );
}
