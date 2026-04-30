"use client";
// Read-only view of another member's profile

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Image as ImageIcon, MapPin } from "lucide-react";
import { FAMILY_ROLE_LABELS, type FamilyRole } from "@/types";
import { PostCard } from "@/components/PostCard";

type CurrentUser = {
  id: string;
  role: string;
};

type MemberProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  role: string;
  createdAt: string;
  profile: {
    id: string;
    bio: string | null;
    familyRole: string | null;
    location: string | null;
    coverUrl: string | null;
    photos: Array<{ id: string; url: string; caption: string | null }>;
    posts: Array<{
      id: string;
      body: string;
      imageUrl: string | null;
      createdAt: string;
      _count?: { likes: number; comments: number };
      visibility?: Array<{ userId: string }>;
      profile: { user: { id: string; firstName: string; lastName: string; photoUrl: string | null } };
    }>;
  };
};

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export default function MemberProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileUser, setProfileUser] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "photos">("timeline");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const me = await meRes.json();
      if (me.id === params.userId) {
        router.push("/profile");
        return;
      }

      const memberRes = await fetch(`/api/members/${params.userId}`);
      if (!memberRes.ok) {
        setLoading(false);
        return;
      }

      const data = await memberRes.json();
      if (!cancelled) {
        setCurrentUser(me);
        setProfileUser(data.user);
        document.title = `${data.user.firstName} ${data.user.lastName} · FamTree`;
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [params.userId, router]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-stone-200 rounded-2xl" />
        <div className="h-8 bg-stone-200 rounded-lg w-48" />
        <div className="h-4 bg-stone-200 rounded w-64" />
      </div>
    );
  }

  if (!currentUser || !profileUser?.profile) {
    return <div className="alert-error">Failed to load profile.</div>;
  }

  const profile = profileUser.profile;
  const userInitials = initials(profileUser.firstName, profileUser.lastName);
  const memberSince = new Date(profileUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const canSendInvite = currentUser.role === "founder" || currentUser.role === "admin";
  const isSiteAdmin = profileUser.role === "founder" || profileUser.role === "admin";

  return (
    <div className="space-y-6">
      <div className="profile-card">
        <div className="relative h-36 bg-gradient-to-br from-stone-200 to-stone-300 rounded-t-2xl overflow-hidden">
          {profile.coverUrl && (
            <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white bg-stone-200 shadow flex items-center justify-center">
              {profileUser.photoUrl ? (
                <img src={profileUser.photoUrl} alt={profileUser.firstName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-stone-500">{userInitials}</span>
              )}
            </div>

            {canSendInvite && (
              <button
                onClick={() => { window.location.href = `/invite?prefill=${encodeURIComponent(profileUser.email)}`; }}
                className="btn-primary text-xs px-3 py-1.5"
              >
                👋 Send Invite
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              {profileUser.firstName} {profileUser.lastName}
            </h1>
            {isSiteAdmin ? (
              <p className="text-sm text-amber-700 font-bold">
                SITE ADMIN
              </p>
            ) : profile.familyRole && (
              <p className="text-sm text-stone-500 font-medium">
                {FAMILY_ROLE_LABELS[profile.familyRole as FamilyRole] ?? profile.familyRole}
              </p>
            )}
            {profile.location && (
              <p className="flex items-center gap-1.5 text-sm text-stone-400">
                <MapPin className="w-3.5 h-3.5" /> {profile.location}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm text-stone-600 leading-relaxed mt-2 pt-2 border-t border-stone-100">
                {profile.bio}
              </p>
            )}
            <p className="text-xs text-stone-400 pt-1">Member since {memberSince}</p>
          </div>
        </div>
      </div>

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

      {activeTab === "timeline" && (
        <div className="space-y-4">
          {profile.posts.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">
              No posts yet.
            </div>
          ) : (
            profile.posts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={currentUser.id} canDelete={false} />
            ))
          )}
        </div>
      )}

      {activeTab === "photos" && (
        <div className="space-y-4">
          {profile.photos.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-sm space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-stone-300" />
              <p>No photos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {profile.photos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-stone-100">
                  <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
