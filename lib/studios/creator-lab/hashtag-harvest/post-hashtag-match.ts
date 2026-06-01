// lib/studios/creator-lab/hashtag-harvest/post-hashtag-match.ts
// Attribute Apify posts to the hashtag search that returned them.

import type { ApifyPost } from "./types";
import { normalizeHashtag } from "./normalize-creators";

/** True when a post belongs to the given harvest hashtag. */
export function postMatchesHashtag(post: ApifyPost, hashtag: string): boolean {
  const norm = normalizeHashtag(hashtag);
  if (!norm) return false;

  const tagged = normalizeHashtag(post.searchHashtag ?? post._harvestHashtag ?? "");
  if (tagged && tagged === norm) return true;

  const inputUrl = (post.inputUrl ?? "").toLowerCase();
  if (
    inputUrl.includes(`/tags/${norm}`) ||
    inputUrl.includes(`/tags/${norm}/`) ||
    inputUrl.includes(`tags%2F${norm}`)
  ) {
    return true;
  }

  const tagList = (post.hashtags ?? []).map((h) => normalizeHashtag(h));
  if (tagList.includes(norm)) return true;

  const caption = (post.caption ?? "").toLowerCase();
  if (caption.includes(`#${norm}`)) return true;

  return false;
}

/** Posts for one hashtag, capped per tag (uses inputUrl, not caption hashtags only). */
export function postsForHashtag(
  posts: ApifyPost[],
  hashtag: string,
  limit: number,
): ApifyPost[] {
  const matched = posts.filter((p) => postMatchesHashtag(p, hashtag));
  return matched.slice(0, limit);
}
