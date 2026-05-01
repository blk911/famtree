"use client";
// app/(app)/profile/page.tsx

import { useState, useEffect, useRef } from "react";
import {
  Plus, Image as ImageIcon, Users, ChevronDown,
} from "lucide-react";
import { PostCard } from "@/components/PostCard";

interface ProfileData {
  id: string;
  bio: string | null;
  familyRole: string | null;
  location: string | null;
  coverUrl: string | null;
  isPublicInTree: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    photoUrl: string | null;
    createdAt: string;
  };
  posts: Array<{
    id: string;
    title?: string | null;
    body: string;
    imageUrl: string | null;
    createdAt: string;
    _count?: { likes: number; comments: number };
    visibility?: Array<{ userId: string }>;
    profile: { user: { id: string; firstName: string; lastName: string; photoUrl: string | null } };
  }>;
  photos: Array<{ id: string; url: string; caption: string | null }>;
}

type TrustUnitOption = {
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

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "photos">("timeline");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState("");
  const [postsShown, setPostsShown] = useState(5);
  const [membersList, setMembersList] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [trustUnits, setTrustUnits] = useState<TrustUnitOption[]>([]);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ id: string; url: string; caption: string | null } | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const postImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxPhoto(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ profile }) => {
        setProfile(profile);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.members) setMembersList(data.members);
        if (data?.trustUnits) setTrustUnits(data.trustUnits);
      })
      .catch(() => null);
  }, []);

  const sameMembers = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const set = new Set(a);
    return b.every((id) => set.has(id));
  };

  const trustUnitMemberIds = (unit: TrustUnitOption) => unit.members.map((member) => member.user.id);

  const trustUnitTitle = (unit: TrustUnitOption) =>
    unit.members
      .map((member) => `${member.user.firstName} ${member.user.lastName}`)
      .join(" · ");

  const handleGalleryPhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("caption", "");
    const res = await fetch("/api/profile/photos", { method: "POST", body: fd });
    const { photo } = await res.json();
    if (res.ok) {
      setProfile((p) => p ? { ...p, photos: [photo, ...p.photos] } : p);
    }
    setUploadingPhoto(false);
  };

  const handleDeletePhoto = async (photoId: string) => {
    const res = await fetch(`/api/profile/photos?photoId=${photoId}`, { method: "DELETE" });
    if (res.ok) {
      setProfile((p) => p ? { ...p, photos: p.photos.filter((photo) => photo.id !== photoId) } : p);
    }
  };

  const handlePostImageSelect = (file: File) => {
    setPostImageFile(file);
    if (postImagePreview) URL.revokeObjectURL(postImagePreview);
    setPostImagePreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostBody.trim()) return;
    setPostSubmitting(true);
    setPostError("");

    try {
      let res: Response;
      if (postImageFile) {
        const fd = new FormData();
        if (newPostTitle.trim()) fd.append("title", newPostTitle.trim());
        fd.append("body", newPostBody);
        fd.append("image", postImageFile);
        if (postImageUrl.trim()) fd.append("imageUrl", postImageUrl.trim());
        if (selectedMembers.length > 0) fd.append("visibleTo", JSON.stringify(selectedMembers));
        res = await fetch("/api/profile/posts", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/profile/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: newPostBody,
            title: newPostTitle.trim() || undefined,
            imageUrl: postImageUrl.trim() || undefined,
            visibleTo: selectedMembers.length > 0 ? selectedMembers : undefined,
          }),
        });
      }

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        setPostError(`Server ${res.status}: ${text.slice(0, 200)}`);
        return;
      }

      if (!res.ok) {
        setPostError(data?.error ?? `Error ${res.status}`);
        return;
      }

      const post = data.post;
      setProfile((p) => p ? { ...p, posts: [post, ...p.posts] } : p);
      setNewPostTitle("");
      setNewPostBody("");
      setPostImageFile(null);
      setPostImageUrl("");
      setSelectedMembers([]);
      setVisibilityOpen(false);
      if (postImagePreview) URL.revokeObjectURL(postImagePreview);
      setPostImagePreview(null);
      if (postImageInputRef.current) postImageInputRef.current.value = "";
    } catch (err: any) {
      setPostError(`Error: ${err?.message ?? String(err)}`);
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    await fetch(`/api/profile/posts?postId=${postId}`, { method: "DELETE" });
    setProfile((p) => p ? { ...p, posts: p.posts.filter((post) => post.id !== postId) } : p);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-stone-200 rounded-2xl" />
        <div className="h-8 bg-stone-200 rounded-lg w-48" />
        <div className="h-4 bg-stone-200 rounded w-64" />
      </div>
    );
  }

  if (!profile) return <div className="alert-error">Failed to load profile.</div>;

  const { user } = profile;
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <div className="content-col space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {(["timeline", "photos"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Timeline tab */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {/* Compose */}
          <form onSubmit={handleCreatePost} className="profile-card p-4 space-y-3">
            {postError && (
              <div className="alert-error">{postError}</div>
            )}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-stone-200 flex-shrink-0 flex items-center justify-center">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-stone-500">{initials}</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  className="field-input text-sm w-full"
                  placeholder="Title (optional)"
                  value={newPostTitle}
                  maxLength={100}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
                <textarea
                  className="field-input resize-none w-full text-sm"
                  rows={3}
                  placeholder="Share something with your family…"
                  value={newPostBody}
                  onChange={(e) => setNewPostBody(e.target.value)}
                />
              </div>
            </div>

            {/* Visibility picker */}
            {membersList.length > 1 && (
              <div style={{ marginLeft: "44px" }}>
                <button
                  type="button"
                  onClick={() => setVisibilityOpen((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    fontSize: "12px", fontWeight: 500,
                    color: selectedMembers.length > 0 ? "#e96c50" : "#78716c",
                    background: "none", border: "none", cursor: "pointer", padding: "2px 0",
                  }}
                >
                  <Users style={{ width: "13px", height: "13px" }} />
                  {selectedMembers.length > 0
                    ? `Visible to ${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""}`
                    : "Everyone"}
                  <ChevronDown style={{
                    width: "12px", height: "12px",
                    transform: visibilityOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                  }} />
                </button>
                {visibilityOpen && (
                  <div style={{
                    marginTop: "8px", padding: "10px 12px", borderRadius: "10px",
                    background: "#fafaf9", border: "1px solid #e7e5e4",
                    maxHeight: "160px", overflowY: "auto",
                  }}>
                    <p style={{ fontSize: "11px", color: "#a8a29e", marginBottom: "8px" }}>
                      Leave all unchecked to share with everyone. Check specific members to restrict.
                    </p>
                    {trustUnits.length > 0 && (
                      <div style={{borderBottom:"1px solid #e7e5e4",paddingBottom:"8px",marginBottom:"8px"}}>
                        <p style={{fontSize:"11px",fontWeight:700,color:"#7c3aed",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.04em"}}>
                          Trust Units
                        </p>
                        {trustUnits.map((unit) => {
                          const ids = trustUnitMemberIds(unit);
                          const checked = sameMembers(selectedMembers, ids);
                          return (
                            <label key={unit.id} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"4px 0", cursor:"pointer", fontSize:"13px", color:"#44403c" }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedMembers(e.target.checked ? ids : []);
                                }}
                              />
                              <span style={{fontWeight:700,color:"#1c1917"}}>TU - {trustUnitTitle(unit)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {membersList
                      .filter((m) => m.id !== user.id)
                      .map((member) => (
                        <label key={member.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer", fontSize: "13px", color: "#44403c" }}>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) => {
                              setSelectedMembers((prev) =>
                                e.target.checked ? [...prev, member.id] : prev.filter((id) => id !== member.id)
                              );
                            }}
                          />
                          {member.firstName} {member.lastName}
                        </label>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginLeft: "44px" }}>
              <input
                className="field-input text-sm w-full"
                placeholder="Image URL (optional)"
                value={postImageUrl}
                onChange={(e) => setPostImageUrl(e.target.value)}
              />
            </div>

            <div className="flex justify-end" style={{ marginLeft: "44px" }}>
              {postImagePreview && (
                <div className="mr-auto relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100">
                  <img src={postImagePreview} alt="Selected attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPostImageFile(null);
                      URL.revokeObjectURL(postImagePreview);
                      setPostImagePreview(null);
                      if (postImageInputRef.current) postImageInputRef.current.value = "";
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                ref={postImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePostImageSelect(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => postImageInputRef.current?.click()}
                className="btn-secondary text-xs px-3 py-2 mr-2 gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Image
              </button>
              <button
                type="submit"
                className="btn-primary text-xs px-4 py-2"
                disabled={postSubmitting || !newPostBody.trim()}
              >
                {postSubmitting ? "Posting…" : "Post"}
              </button>
            </div>
          </form>

          {/* Posts */}
          {profile.posts.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">
              No posts yet — share something with your family!
            </div>
          ) : (
            <>
              {profile.posts.slice(0, postsShown).map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user.id} canDelete onDelete={handleDeletePost} />
              ))}
              {profile.posts.length > postsShown && (
                <button
                  type="button"
                  onClick={() => setPostsShown((n) => n + 5)}
                  style={{
                    width: "100%", padding: "10px",
                    background: "none", border: "1px solid #e7e5e4",
                    borderRadius: "12px", cursor: "pointer",
                    fontSize: "13px", fontWeight: 500, color: "#78716c",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fafaf9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  Show more ({profile.posts.length - postsShown} remaining)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Photos tab */}
      {activeTab === "photos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleGalleryPhotoUpload(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="btn-primary text-xs px-4 py-2 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {uploadingPhoto ? "Uploading…" : "Add Photo"}
            </button>
          </div>

          {profile.photos.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-sm space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-stone-300" />
              <p>No photos yet</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexWrap:"wrap", gap:"12px" }}>
              {profile.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group"
                  style={{ position:"relative", width:"300px", flexShrink:0 }}
                >
                  {/* Photo card — 300px wide, proportional height */}
                  <div
                    style={{
                      width:"300px", borderRadius:"14px", overflow:"hidden",
                      background:"#f5f4f0", cursor:"pointer",
                      boxShadow:"0 1px 4px rgba(0,0,0,0.07)",
                      border:"1px solid #ece9e3",
                    }}
                    onClick={() => setLightboxPhoto(photo)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption ?? ""}
                      style={{ width:"100%", height:"auto", display:"block", maxHeight:"400px", objectFit:"cover" }}
                    />
                    {photo.caption && (
                      <div style={{ padding:"8px 12px", fontSize:"12px", color:"#78716c" }}>
                        {photo.caption}
                      </div>
                    )}
                  </div>

                  {/* Delete button — hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      position:"absolute", top:"8px", right:"8px",
                      width:"28px", height:"28px", borderRadius:"50%",
                      background:"rgba(0,0,0,0.55)", color:"white",
                      border:"none", cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"16px", lineHeight:1,
                    }}
                    title="Delete photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox popout */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          style={{
            position:"fixed", inset:0, zIndex:60,
            background:"rgba(0,0,0,0.85)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:"24px",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxPhoto(null)}
            style={{
              position:"absolute", top:"20px", right:"24px",
              background:"rgba(255,255,255,0.12)", border:"none",
              color:"white", fontSize:"22px", width:"40px", height:"40px",
              borderRadius:"50%", cursor:"pointer", display:"flex",
              alignItems:"center", justifyContent:"center",
            }}
          >
            ×
          </button>

          {/* Image — stops click bubbling to overlay */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth:"90vw", maxHeight:"90vh", textAlign:"center" }}
          >
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption ?? ""}
              style={{
                maxWidth:"100%", maxHeight:"85vh",
                borderRadius:"16px",
                boxShadow:"0 32px 80px rgba(0,0,0,0.6)",
                display:"block",
              }}
            />
            {lightboxPhoto.caption && (
              <p style={{ color:"rgba(255,255,255,0.7)", marginTop:"14px", fontSize:"14px" }}>
                {lightboxPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
