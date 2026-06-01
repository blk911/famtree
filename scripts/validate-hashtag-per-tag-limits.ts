/**
 * Validates per-hashtag post limits (no global cap).
 * Run: npx tsx scripts/validate-hashtag-per-tag-limits.ts
 */
import { generateMockPosts } from "../lib/studios/creator-lab/hashtag-harvest/mock-harvest";
import { extractPostCreators } from "../lib/studios/creator-lab/hashtag-harvest/extract-post-creators";
import { normalizeCreators } from "../lib/studios/creator-lab/hashtag-harvest/normalize-creators";
import {
  computeHashtagHarvestStats,
  postsForHashtag,
} from "../lib/studios/creator-lab/hashtag-harvest/compute-hashtag-stats";
import { DEFAULT_MAX_POSTS_PER_HASHTAG } from "../lib/studios/creator-lab/hashtag-harvest/limits";

const hashtags = ["denvernails", "nailtech", "hairstylist"];
const maxPerHashtag = DEFAULT_MAX_POSTS_PER_HASHTAG;

const posts = generateMockPosts(hashtags, maxPerHashtag);
const allSeeds = [];
for (const hashtag of hashtags) {
  const tagPosts = postsForHashtag(posts, hashtag, maxPerHashtag);
  allSeeds.push(
    ...extractPostCreators(tagPosts, hashtag, "Denver, CO", "", "salon"),
  );
}
const normalized = normalizeCreators(allSeeds);
const { perHashtag, totals } = computeHashtagHarvestStats(
  hashtags,
  posts,
  allSeeds,
  normalized,
  [],
  maxPerHashtag,
);

let ok = true;
for (const row of perHashtag) {
  if (row.postsPulled !== maxPerHashtag) {
    console.error(`FAIL #${row.hashtag}: expected ${maxPerHashtag} posts, got ${row.postsPulled}`);
    ok = false;
  } else {
    console.log(`OK #${row.hashtag}: ${row.postsPulled} posts, ${row.creatorsFound} creators`);
  }
}

if (totals.postsPulled !== maxPerHashtag * hashtags.length) {
  console.error(`FAIL totals.postsPulled: expected ${maxPerHashtag * hashtags.length}, got ${totals.postsPulled}`);
  ok = false;
}

if (normalized.length < hashtags.length) {
  console.error("FAIL: normalize collapsed all hashtags into too few seeds");
  ok = false;
}

console.log(ok ? "\nValidation passed." : "\nValidation failed.");
process.exit(ok ? 0 : 1);
