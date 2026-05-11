"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PostCard } from "@/components/PostCard";

interface Post {
  id:         string;
  title?:     string | null;
  body:       string;
  imageUrl:   string | null;
  createdAt:  string;
  _count?:    { likes: number; comments: number };
  visibility?: Array<{ userId: string }>;
  profile: {
    user: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  };
}

interface Props {
  currentUserId: string;
}

export function MyPostsMount({ currentUserId }: Props) {
  const [posts,   setPosts]   = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(data => {
        // API returns { id, bio, ..., posts: [...] } at the top level
        const raw: Post[] = data.posts ?? data.profile?.posts ?? [];
        setPosts(raw);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  if (loading) {
    return (
      <div style={{ padding:"24px 0", display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3].map(n => (
          <div key={n} style={{
            height:72, borderRadius:12, background:"#f5f4f0",
            animation:"pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"32px 0" }}>
        <p style={{ fontSize:14, color:"#a8a29e", margin:"0 0 14px" }}>
          You haven&apos;t posted anything yet.
        </p>
        <Link href="/family-vault/posts" style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"9px 16px", background:"#1c1917", color:"white",
          borderRadius:9, textDecoration:"none", fontSize:13, fontWeight:700,
        }}>
          ✏️ Write your first post
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
        <Link href="/family-vault/posts" style={{ fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" }}>
          ✏️ New post →
        </Link>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post as any}
            currentUserId={currentUserId}
            canDelete={true}
            onDelete={(postId) => setPosts(prev => prev?.filter(p => p.id !== postId) ?? [])}
          />
        ))}
      </div>
    </div>
  );
}
