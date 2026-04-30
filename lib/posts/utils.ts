type PostWithCreatedAt = {
  id: string;
  createdAt: Date | string;
};

export function dedupePosts<T extends PostWithCreatedAt>(posts: T[]): T[] {
  const map = new Map<string, T>();

  for (const post of posts) {
    map.set(post.id, post);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
