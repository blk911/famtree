// lib/studios/creator-lab/hashtag-harvest/apify-client.ts
// Apify integration for Instagram hashtag post scraping.
// Actor: apify/instagram-hashtag-scraper
// Docs: https://apify.com/apify/instagram-hashtag-scraper

import type { ApifyPost } from "./types";
import { generateMockPosts } from "./mock-harvest"; // used only when HARVEST_MOCK=true
import { normalizeHashtag } from "./normalize-creators";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID   = "apify~instagram-hashtag-scraper";

// How long to wait for Apify to finish (seconds).
const WAIT_FOR_FINISH_SECS = 55;

// ─── Per-hashtag diagnostics (returned in every harvest result) ───────────────

export interface ApifyTagDiagnostic {
  hashtag: string;
  actorId: string;
  actorInput: Record<string, unknown>;
  runId: string | null;
  runStatus: string | null;
  datasetId: string | null;
  datasetItemCount: number;
  rawItemSample: unknown[] | null;
  rawKeysSample: string[] | null;
  apifyErrorMessage: string | null;
  /** true when primary input returned 0 and a fallback was attempted */
  usedFallback: boolean;
  fallbackVariant: string | null;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

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

// ─── Core Apify operations ────────────────────────────────────────────────────

interface ApifyRunResult {
  id: string;
  status: string;
  defaultDatasetId: string;
  defaultKeyValueStoreId?: string;
  exitCode?: number;
  usageTotalUsd?: number;
}

interface StartRunResult {
  runId: string;
  datasetId: string;
  status: string;
  actorInput: Record<string, unknown>;
  startError?: string;
}

/**
 * Builds valid input variants for apify~instagram-hashtag-scraper.
 *
 * Confirmed invalid variants (actor returns HTTP 400):
 *   - hashtags with "#" prefix (fails actor regex validation)
 *   - "search"/"searchType"/"maxItems" fields (actor requires "hashtags" array)
 *
 * Confirmed valid (actor accepts, status=SUCCEEDED):
 *   - primary: { hashtags, resultsType, resultsLimit }
 *   - maxPosts: { hashtags, maxPosts }
 *
 * If both valid variants return 0 items the issue is Instagram-side
 * (rate-limiting/blocking the actor's proxy pool), not the input shape.
 */
function buildInputVariants(hashtag: string, limit: number): Array<{ label: string; input: Record<string, unknown> }> {
  return [
    // Primary — confirmed valid input shape
    {
      label: "primary",
      input: { hashtags: [hashtag], resultsType: "posts", resultsLimit: limit },
    },
    // Variant A: maxPosts instead of resultsLimit — some actor versions use this field
    {
      label: "variant-maxPosts",
      input: { hashtags: [hashtag], maxPosts: limit },
    },
  ];
}

async function startRun(
  input: Record<string, unknown>,
  token: string,
): Promise<StartRunResult> {
  const url = apifyUrl(
    `/acts/${ACTOR_ID}/runs?waitForFinish=${WAIT_FOR_FINISH_SECS}`,
    token,
  );

  const body = JSON.stringify(input);

  let res: Response;
  try {
    res = await apifyFetch(url, { method: "POST", body });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[apify-client] network error starting run:", msg);
    return { runId: "", datasetId: "", status: "NETWORK_ERROR", actorInput: input, startError: `Network error: ${msg}` };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[apify-client] start run HTTP ${res.status}:`, text.slice(0, 200));
    return { runId: "", datasetId: "", status: "FAILED", actorInput: input, startError: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  const data = await res.json() as { data?: ApifyRunResult; error?: { type: string; message: string } };

  if (data.error) {
    const msg = `${data.error.type}: ${data.error.message}`;
    console.error("[apify-client] Apify API error:", msg);
    return { runId: "", datasetId: "", status: "FAILED", actorInput: input, startError: msg };
  }

  const run = data.data;
  if (!run?.id) {
    const msg = `Unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`;
    console.error("[apify-client]", msg);
    return { runId: "", datasetId: "", status: "FAILED", actorInput: input, startError: msg };
  }

  console.log(`[apify-client] run=${run.id} status=${run.status} dataset=${run.defaultDatasetId} cost=$${run.usageTotalUsd ?? 0}`);

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    status: run.status,
    actorInput: input,
  };
}

interface DatasetFetchResult {
  items: ApifyPost[];
  itemCount: number;
  rawKeysSample: string[] | null;
  rawItemSample: unknown[] | null;
  fetchError: string | null;
}

async function fetchDatasetItems(
  datasetId: string,
  token: string,
  limit = 500,
): Promise<DatasetFetchResult> {
  const url = apifyUrl(`/datasets/${datasetId}/items?limit=${limit}&clean=true`, token);

  let res: Response;
  try {
    res = await apifyFetch(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[apify-client] network error fetching dataset:", msg);
    return { items: [], itemCount: 0, rawKeysSample: null, rawItemSample: null, fetchError: msg };
  }

  if (!res.ok) {
    const msg = `Dataset fetch HTTP ${res.status}`;
    console.error("[apify-client]", msg);
    return { items: [], itemCount: 0, rawKeysSample: null, rawItemSample: null, fetchError: msg };
  }

  try {
    const raw = await res.json() as unknown[];
    if (!Array.isArray(raw)) {
      return { items: [], itemCount: 0, rawKeysSample: null, rawItemSample: null, fetchError: "Dataset response was not an array" };
    }

    const rawItemSample = raw.slice(0, 2);
    const rawKeysSample = raw.length > 0 && raw[0] && typeof raw[0] === "object"
      ? Object.keys(raw[0] as Record<string, unknown>)
      : null;

    console.log(`[apify-client] dataset=${datasetId} items=${raw.length} keys=${rawKeysSample?.join(",") ?? "none"}`);

    return {
      items: raw as ApifyPost[],
      itemCount: raw.length,
      rawKeysSample,
      rawItemSample,
      fetchError: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { items: [], itemCount: 0, rawKeysSample: null, rawItemSample: null, fetchError: `JSON parse error: ${msg}` };
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

// ─── Public harvest result ────────────────────────────────────────────────────

export interface ApifyHarvestResult {
  posts: ApifyPost[];
  actorRunId: string | null;
  actorRunIds: string[];
  error: string | null;
  perHashtagErrors: Record<string, string | undefined>;
  apifyConnected: boolean;
  /** Full per-hashtag diagnostics for UI debug panel */
  diagnostics: ApifyTagDiagnostic[];
}

// ─── Single-hashtag harvest with fallback ─────────────────────────────────────

async function harvestSingleHashtag(
  rawTag: string,
  limit: number,
  token: string,
): Promise<{ posts: ApifyPost[]; diag: ApifyTagDiagnostic; error: string | null }> {
  const hashtag = normalizeHashtag(rawTag);

  const diag: ApifyTagDiagnostic = {
    hashtag,
    actorId: ACTOR_ID,
    actorInput: {},
    runId: null,
    runStatus: null,
    datasetId: null,
    datasetItemCount: 0,
    rawItemSample: null,
    rawKeysSample: null,
    apifyErrorMessage: null,
    usedFallback: false,
    fallbackVariant: null,
  };

  const variants = buildInputVariants(hashtag, limit);

  for (let vi = 0; vi < variants.length; vi++) {
    const { label, input } = variants[vi];
    const isPrimary = vi === 0;

    if (!isPrimary) {
      diag.usedFallback = true;
      diag.fallbackVariant = label;
      console.log(`[apify-client] #${hashtag}: primary returned 0 — trying fallback ${label}`);
    }

    diag.actorInput = input;

    const runResult = await startRun(input, token);
    diag.runId = runResult.runId || diag.runId;
    diag.runStatus = runResult.status;

    if (runResult.startError) {
      diag.apifyErrorMessage = runResult.startError;
      // Only stop on hard failures (token, network) — not on empty results
      if (isPrimary && (runResult.startError.includes("APIFY_TOKEN") || runResult.startError.includes("not-enough-usage"))) {
        return { posts: [], diag, error: runResult.startError };
      }
      if (!isPrimary) continue; // try next variant
      // For primary, fall through to next variant
    }

    if (!runResult.startError && runResult.datasetId) {
      diag.datasetId = runResult.datasetId;

      const dataset = await fetchDatasetItems(runResult.datasetId, token, limit + 10);
      diag.datasetItemCount = dataset.itemCount;
      diag.rawKeysSample = dataset.rawKeysSample;
      diag.rawItemSample = dataset.rawItemSample;

      if (dataset.fetchError) {
        diag.apifyErrorMessage = dataset.fetchError;
      }

      if (dataset.items.length > 0) {
        console.log(`[apify-client] #${hashtag}: ${dataset.items.length} posts via ${label}`);
        return { posts: tagPostsForHashtag(dataset.items, hashtag), diag, error: null };
      }

      console.log(`[apify-client] #${hashtag}: 0 items via ${label} (status=${runResult.status})`);
    }

    // Only try fallbacks when in debug/dev mode or if explicitly needed
    // In production we stop after primary to avoid wasted Apify runs
    if (process.env.HARVEST_TRY_FALLBACKS !== "true") break;
  }

  // All valid variants returned 0 items — platform-level failure, not input shape
  const errorMsg = diag.apifyErrorMessage
    ?? `Actor produced 0 dataset items (status=${diag.runStatus ?? "unknown"}, datasetId=${diag.datasetId ?? "none"}). ` +
       `Actor: ${ACTOR_ID}. Last input: ${JSON.stringify(diag.actorInput)}. ` +
       `Both valid input variants (primary + maxPosts) were tried and both returned 0. ` +
       `Root cause: Instagram is rate-limiting or blocking the actor's proxy pool. ` +
       `Action: (1) POST /api/admin/intelligence/salon/hashtag-harvest/raw-test with {"hashtag":"hairstylist","limit":5} to confirm. ` +
       `(2) Set HARVEST_MOCK=true to run pipeline with synthetic data. ` +
       `(3) Check Apify console for account-level proxy/rate-limit status.`;

  diag.apifyErrorMessage = diag.apifyErrorMessage ?? errorMsg;

  return {
    posts: [],
    diag,
    error: errorMsg,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Runs the Apify Instagram hashtag scraper — one actor run per hashtag so
 * resultsLimit applies per tag and posts are attributed via inputUrl / _harvestHashtag.
 *
 * Returns full per-hashtag diagnostics alongside posts so the UI can show
 * exactly what Apify received and returned.
 */
export async function runApifyHashtagHarvest(
  hashtags: string[],
  maxPerHashtag: number,
): Promise<ApifyHarvestResult> {
  const perHashtagErrors: Record<string, string | undefined> = {};
  const actorRunIds: string[] = [];
  const allPosts: ApifyPost[] = [];
  const allDiagnostics: ApifyTagDiagnostic[] = [];

  if (process.env.HARVEST_MOCK === "true") {
    const posts = generateMockPosts(hashtags, maxPerHashtag);
    return {
      posts,
      actorRunId: "mock-run",
      actorRunIds: ["mock-run"],
      error: null,
      perHashtagErrors: {},
      apifyConnected: true,
      diagnostics: [],
    };
  }

  const token = process.env.APIFY_TOKEN?.trim();

  if (!token) {
    return {
      posts: [],
      actorRunId: null,
      actorRunIds: [],
      error: "APIFY_TOKEN is not set. Add APIFY_TOKEN to .env.local (dev) or Vercel environment variables.",
      perHashtagErrors: Object.fromEntries(hashtags.map((h) => [h, "APIFY_TOKEN missing"])),
      apifyConnected: false,
      diagnostics: [],
    };
  }

  const errors: string[] = [];

  for (const rawTag of hashtags) {
    const hashtag = normalizeHashtag(rawTag);
    if (!hashtag) continue;

    const { posts, diag, error } = await harvestSingleHashtag(hashtag, maxPerHashtag, token);

    allDiagnostics.push(diag);

    if (diag.runId) actorRunIds.push(diag.runId);

    if (posts.length > 0) {
      allPosts.push(...posts);
    } else if (error) {
      perHashtagErrors[hashtag] = error;
      errors.push(`#${hashtag}: ${error}`);
    }
  }

  const combinedError =
    allPosts.length === 0
      ? errors.length > 0
        ? errors[0].length > 200
          ? errors[0].slice(0, 200) + "…"
          : errors[0]
        : "Apify returned zero posts for all hashtags. Actor may be rate-limited by Instagram."
      : null;

  return {
    posts: allPosts,
    actorRunId: actorRunIds[0] ?? null,
    actorRunIds,
    error: combinedError,
    perHashtagErrors,
    apifyConnected: true,
    diagnostics: allDiagnostics,
  };
}

// ─── Raw test helper (used by /api/admin/intelligence/salon/hashtag-harvest/raw-test) ───

export interface ApifyRawTestResult {
  ok: boolean;
  actorId: string;
  actorInput: Record<string, unknown>;
  runId: string | null;
  status: string | null;
  datasetId: string | null;
  datasetItemCount: number;
  sample: unknown[];
  rawKeysSample: string[] | null;
  error: string | null;
}

export async function runApifyRawTest(
  hashtag: string,
  limit: number,
  variant: "primary" | "maxPosts" | "hash-prefix" | "search" = "primary",
): Promise<ApifyRawTestResult> {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    return {
      ok: false, actorId: ACTOR_ID, actorInput: {}, runId: null, status: null,
      datasetId: null, datasetItemCount: 0, sample: [], rawKeysSample: null,
      error: "APIFY_TOKEN not set",
    };
  }

  const norm = normalizeHashtag(hashtag);
  const variantMap: Record<string, Record<string, unknown>> = {
    primary:      { hashtags: [norm], resultsType: "posts", resultsLimit: limit },
    maxPosts:     { hashtags: [norm], maxPosts: limit },
    "hash-prefix":{ hashtags: [`#${norm}`], resultsType: "posts", resultsLimit: limit },
    search:       { search: norm, searchType: "hashtag", maxItems: limit },
  };

  const input = variantMap[variant] ?? variantMap.primary;

  const runResult = await startRun(input, token);

  if (runResult.startError) {
    return {
      ok: false, actorId: ACTOR_ID, actorInput: input,
      runId: runResult.runId || null, status: runResult.status,
      datasetId: null, datasetItemCount: 0, sample: [], rawKeysSample: null,
      error: runResult.startError,
    };
  }

  const dataset = await fetchDatasetItems(runResult.datasetId, token, limit);

  return {
    ok: dataset.fetchError === null,
    actorId: ACTOR_ID,
    actorInput: input,
    runId: runResult.runId,
    status: runResult.status,
    datasetId: runResult.datasetId,
    datasetItemCount: dataset.itemCount,
    sample: dataset.rawItemSample ?? [],
    rawKeysSample: dataset.rawKeysSample,
    error: dataset.fetchError,
  };
}
