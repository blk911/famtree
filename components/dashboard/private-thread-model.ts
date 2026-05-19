import { directThreadKey } from "@/lib/private-thread-keys";

export type PrivateFeedPost = {
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

export type PrivateMember = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export type TrustUnitRow = {
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

export type ThreadType = "tu" | "direct" | "group";

export type PrivateThread = {
  key: string;
  type: ThreadType;
  label: string;
  memberIds: string[];
  posts: PrivateFeedPost[];
  unit?: TrustUnitRow;
};

function participantKey(visibilityIds: string[], authorId: string): string {
  const ids = new Set([...visibilityIds, authorId]);
  return Array.from(ids).sort().join(",");
}

export function tuThreadKey(unit: TrustUnitRow): string {
  return unit.members.map((m) => m.user.id).sort().join(",");
}

export function buildPrivateThreads(
  items: PrivateFeedPost[],
  trustUnits: TrustUnitRow[],
  memberMap: Map<string, PrivateMember>,
  currentUserId: string,
  bondPeers: PrivateMember[],
): PrivateThread[] {
  const grouped = new Map<string, PrivateFeedPost[]>();
  for (const post of items) {
    const visIds = post.visibility?.map((v) => v.userId) ?? [];
    if (visIds.length === 0) continue;
    const key = participantKey(visIds, post.profile.user.id);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(post);
  }

  const tuThreads: PrivateThread[] = trustUnits.map((unit) => {
    const key = tuThreadKey(unit);
    const posts = grouped.get(key) ?? [];
    grouped.delete(key);
    return {
      key,
      type: "tu",
      label: unit.members.map((m) => `${m.user.firstName} ${m.user.lastName}`).join(" · "),
      memberIds: unit.members.map((m) => m.user.id),
      posts,
      unit,
    };
  });

  const otherThreads: PrivateThread[] = [];
  grouped.forEach((threadPosts, key) => {
    const memberIds = key.split(",");
    const otherIds = memberIds.filter((id) => id !== currentUserId);
    const type: ThreadType = otherIds.length === 1 ? "direct" : "group";
    const label = otherIds
      .map((id) => {
        const m = memberMap.get(id);
        return m ? `${m.firstName} ${m.lastName}` : "Unknown";
      })
      .join(" · ");
    otherThreads.push({ key, type, label, memberIds, posts: threadPosts });
  });

  tuThreads.sort((a, b) => b.posts.length - a.posts.length);
  otherThreads.sort((a, b) =>
    (b.posts[0]?.createdAt ?? "").localeCompare(a.posts[0]?.createdAt ?? ""),
  );

  const merged = [...tuThreads, ...otherThreads];
  const keys = new Set(merged.map((t) => t.key));
  const seeded: PrivateThread[] = [];
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
  seeded.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

  return [...merged, ...seeded];
}

export function peerIdFromDirectThread(
  thread: PrivateThread,
  currentUserId: string,
): string | null {
  if (thread.type !== "direct") return null;
  return thread.memberIds.find((id) => id !== currentUserId) ?? null;
}
