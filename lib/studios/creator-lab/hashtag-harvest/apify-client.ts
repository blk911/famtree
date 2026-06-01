// lib/studios/creator-lab/hashtag-harvest/apify-client.ts
// Apify integration for Instagram hashtag post scraping.
// Actor: apify/instagram-hashtag-scraper
// Docs: https://apify.com/apify/instagram-hashtag-scraper

import type { ApifyPost } from "./types";
import { generateMockPosts } from "./mock-harvest"; // used only when HARVEST_MOCK=true
import { normalizeHashtag } from "./normalize-creators";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID  = "apify~instagram-hashtag-scraper";

// How long to wait for Apify to finish (seconds).
const WAIT_FOR_FINISH_SECS = 55;

function apifyUrl(path: string, token: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${APIFY_BASE}${path}${sep}token=${encodeURIComponent(token)}`;
}

async function apifyFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
}

interface ApifyRunResult {
  id: string;
  status: string;
  defaultDatasetId: string;
}

async function startRun(
  hashtags: string[],
  maxPerHashtag: number,
  token: string,
): Promise<{ runId: string; datasetId: string; status: string; startError?: string } | null> {
  const url = apifyUrl(
    `/acts/${ACTOR_ID}/runs?waitForFinish=${WAIT_FOR_FINISH_SECS}`,
    token,
  );

  const body = JSON.stringify({
    hashtags: hashtags.map((h) => normalizeHashtag(h)),
    resultsType: "posts",
    resultsLimit: maxPerHashtag,
  });

  let res: Response;
  try {
    res = await apifyFetch(url, { method: "POST", body });
  } catch (e) {
    console.error("[apify-client] network error starting run:", e);
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[apify-client] start run HTTP ${res.status}:`, text.slice(0, 200));
    return { runId: "", datasetId: "", status: "FAILED", startError: `HTTP ${res.status}: ${text.slice(0, 120)}` };
  }

  const data = await res.json() as { data?: ApifyRunResult };
  const run = data.data;
  if (!run?.id) {
    console.error("[apify-client] unexpected run response shape:", JSON.stringify(data).slice(0, 200));
    return null;
  }

  return { runId: run.id, datasetId: run.defaultDatasetId, status: run.status };
}

async function fetchDatasetItems(
  datasetId: string,
  token: string,
  limit = 500,
): Promise<ApifyPost[]> {
  const url = apifyUrl(`/datasets/${datasetId}/items?limit=${limit}&clean=true`, token);

  let res: Response;
  try {
    res = await apifyFetch(url);
  } catch (e) {
    console.error("[apify-client] network error fetching dataset:", e);
    return [];
  }

  if (!res.ok) {
    console.error(`[apify-client] dataset fetch HTTP ${res.status}`);
    return [];
  }

  try {
    const items = await res.json() as unknown[];
    if (!Array.isArray(items)) return [];
    return items as ApifyPost[];
  } catch {
    return [];
  }
}

function tagPostsForHashtag(posts: ApifyPost[], hashtag: string): ApifyPost[] {
  const norm = normalizeHashtag(hashtag);
  return posts.map((p) => ({
    ...p,
    _harvestHashtag: norm,
    inputUrl: p.inputUrl ?? `https://www.instagram.com/explore/tags/${norm}`,
  }));
}

export interface ApifyHarvestResult {
  posts: ApifyPost[];
  actorRunId: string | null;
  actorRunIds: string[];
  error: string | null;
  perHashtagErrors: Record<string, string | undefined>;
  apifyConnected: boolean;
}

/**
 * Runs the Apify Instagram hashtag scraper — one actor run per hashtag so
 * resultsLimit applies per tag and posts are attributed via inputUrl / _harvestHashtag.
 */
export async function runApifyHashtagHarvest(
  hashtags: string[],
  maxPerHashtag: number,
): Promise<ApifyHarvestResult> {
  const perHashtagErrors: Record<string, string | undefined> = {};
  const actorRunIds: string[] = [];
  const allPosts: ApifyPost[] = [];

  if (process.env.HARVEST_MOCK === "true") {
    const posts = generateMockPosts(hashtags, maxPerHashtag);
    return {
      posts,
      actorRunId: "mock-run",
      actorRunIds: ["mock-run"],
      error: null,
      perHashtagErrors: {},
      apifyConnected: true,
    };
  }

  const token = process.env.APIFY_TOKEN?.trim();

  if (!token) {
    return {
      posts: [],
      actorRunId: null,
      actorRunIds: [],
      error:
        "APIFY_TOKEN is not set. Add APIFY_TOKEN to .env.local (dev) or Vercel environment variables.",
      perHashtagErrors: Object.fromEntries(hashtags.map((h) => [h, "APIFY_TOKEN missing"])),
      apifyConnected: false,
    };
  }

  const errors: string[] = [];

  for (const rawTag of hashtags) {
    const hashtag = normalizeHashtag(rawTag);
    if (!hashtag) continue;

    const runInfo = await startRun([hashtag], maxPerHashtag, token);
    if (!runInfo || runInfo.startError) {
      const msg = runInfo?.startError ?? "Apify run failed to start (network or invalid response)";
      perHashtagErrors[hashtag] = msg;
      errors.push(`#${hashtag}: ${msg}`);
      continue;
    }

    actorRunIds.push(runInfo.runId);

    const tagPosts = await fetchDatasetItems(
      runInfo.datasetId,
      token,
      maxPerHashtag + 10,
    );

    if (runInfo.status !== "SUCCEEDED" && tagPosts.length === 0) {
      const msg = `Apify run status: ${runInfo.status}. No items returned.`;
      perHashtagErrors[hashtag] = msg;
      errors.push(`#${hashtag}: ${msg}`);
      continue;
    }

    allPosts.push(...tagPostsForHashtag(tagPosts, hashtag));
  }

  const combinedError =
    errors.length > 0
      ? errors.join(" | ")
      : allPosts.length === 0
        ? "Apify returned zero posts for all hashtags. Check APIFY_TOKEN, actor quota, or hashtag visibility."
        : null;

  return {
    posts: allPosts,
    actorRunId: actorRunIds[0] ?? null,
    actorRunIds,
    error: combinedError,
    perHashtagErrors,
    apifyConnected: true,
  };
}
