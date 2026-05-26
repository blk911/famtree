// lib/studios/creator-lab/hashtag-harvest/apify-client.ts
// Apify integration for Instagram hashtag post scraping.
// Actor: apify/instagram-hashtag-scraper
// Docs: https://apify.com/apify/instagram-hashtag-scraper

import type { ApifyPost } from "./types";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID  = "apify~instagram-hashtag-scraper";

// How long to wait for Apify to finish (seconds).
// Vercel maxDuration is set to 120s; leave headroom for resolver phase.
const WAIT_FOR_FINISH_SECS = 55;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Start run (with waitForFinish) ──────────────────────────────────────────

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
    hashtags: hashtags.map((h) => h.replace(/^#/, "").toLowerCase().trim()),
    resultsLimit: maxPerHashtag,
    // Some actor versions use these alternate field names
    maxResults: maxPerHashtag,
    scrapeType: "posts",
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
    // Return a typed error so callers can surface the HTTP status to the admin
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

// ─── Fetch dataset items ──────────────────────────────────────────────────────

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

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ApifyHarvestResult {
  posts: ApifyPost[];
  actorRunId: string | null;
  error: string | null;
}

/**
 * Runs the Apify Instagram hashtag scraper and returns raw post items.
 * Gracefully handles missing token, network errors, actor failures.
 */
export async function runApifyHashtagHarvest(
  hashtags: string[],
  maxPerHashtag: number,
): Promise<ApifyHarvestResult> {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    return {
      posts: [],
      actorRunId: null,
      error: "APIFY_TOKEN is not set. Add it to Vercel → Settings → Environment Variables.",
    };
  }

  const runInfo = await startRun(hashtags, maxPerHashtag, token);
  if (!runInfo || runInfo.startError) {
    return {
      posts: [],
      actorRunId: runInfo?.runId || null,
      error: `Apify actor run failed to start — ${runInfo?.startError ?? "network error or unexpected response"}`,
    };
  }

  const { runId, datasetId, status } = runInfo;

  // If run finished within waitForFinish window → fetch items
  // If still RUNNING (timeout) → fetch whatever is in the dataset so far
  const posts = await fetchDatasetItems(datasetId, token, maxPerHashtag * hashtags.length * 2);

  if (status !== "SUCCEEDED" && posts.length === 0) {
    return {
      posts: [],
      actorRunId: runId,
      error: `Apify run status: ${status}. No items returned. The actor may have been rate-limited or blocked.`,
    };
  }

  return { posts, actorRunId: runId, error: null };
}
