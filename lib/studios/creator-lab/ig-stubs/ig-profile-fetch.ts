// lib/studios/creator-lab/ig-stubs/ig-profile-fetch.ts
// Fetch Instagram profile data (biography + externalUrl) via Apify's free profile scraper.
// Actor: apify/instagram-profile-scraper
//
// This is the "direct URL" step that runs BEFORE generated-candidate URL matching.
// A Square/Vagaro/GG URL in externalUrl resolves without any generated-URL probing.

const ACTOR_ID   = "apify~instagram-profile-scraper";
const APIFY_BASE = "https://api.apify.com/v2";
const WAIT_SECS  = 55;

// ─── Output types ─────────────────────────────────────────────────────────────

export interface IgProfileData {
  handle: string;
  /** The external URL set on the IG profile (bio link), if any. */
  externalUrl: string | null;
  /** Profile biography text. */
  biography: string | null;
  /** Full name / display name from profile. */
  fullName: string | null;
  /** Additional external URLs (some profiles have multiple). */
  extraExternalUrls: string[];
  /** True when the profile was found and data was extracted. */
  found: boolean;
  error: string | null;
}

export interface IgProfileFetchResult {
  profiles: Map<string, IgProfileData>;
  /** True if the Apify run itself succeeded (even if individual profiles returned no data). */
  apifyOk: boolean;
  runId: string | null;
  error: string | null;
}

// ─── URL parsing from bio text ────────────────────────────────────────────────

const URL_IN_TEXT = /https?:\/\/[^\s<>"'）\]]+/gi;

function normalizeProfileExternalUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const u = raw.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}/i.test(u)) return `https://${u}`;
  return u;
}

/** Extract bare https?:// URLs from biography text. */
export function extractUrlsFromBio(bio: string): string[] {
  return Array.from(new Set((bio.match(URL_IN_TEXT) ?? []).map((u) => u.replace(/[.,;)!?]+$/, ""))));
}

// ─── Apify helpers ────────────────────────────────────────────────────────────

function apifyUrl(path: string, token: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${APIFY_BASE}${path}${sep}token=${encodeURIComponent(token)}`;
}

interface ApifyProfileItem {
  username?: string;
  fullName?: string;
  biography?: string;
  externalUrl?: string | null;
  externalUrlShimmed?: string | null;
  externalUrls?: Array<{ url?: string; title?: string }>;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches Instagram profile data for a batch of handles in a single Apify run.
 * Returns a Map keyed by lowercase handle.
 *
 * Cost: ~$0.002 per profile.  Runtime: ~8–15s for up to 10 handles.
 * If APIFY_TOKEN is absent the function returns an error result without throwing.
 */
export async function fetchIgProfiles(handles: string[]): Promise<IgProfileFetchResult> {
  const empty = (): IgProfileFetchResult => ({
    profiles: new Map(),
    apifyOk: false,
    runId: null,
    error: null,
  });

  if (handles.length === 0) return empty();

  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    return { ...empty(), error: "APIFY_TOKEN not set" };
  }

  const url = apifyUrl(`/acts/${ACTOR_ID}/runs?waitForFinish=${WAIT_SECS}`, token);
  const body = JSON.stringify({ usernames: handles });

  let runRes: Response;
  try {
    runRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body,
      signal: AbortSignal.timeout(70_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ig-profile-fetch] network error:", msg);
    return { ...empty(), error: `Network error: ${msg}` };
  }

  if (!runRes.ok) {
    const text = await runRes.text().catch(() => "");
    const msg = `HTTP ${runRes.status}: ${text.slice(0, 200)}`;
    console.error("[ig-profile-fetch] run failed:", msg);
    return { ...empty(), error: msg };
  }

  const runData = await runRes.json() as { data?: { id: string; status: string; defaultDatasetId: string } };
  const run = runData.data;
  if (!run?.id) {
    return { ...empty(), error: "Unexpected run response shape" };
  }

  console.log(`[ig-profile-fetch] run=${run.id} status=${run.status} dataset=${run.defaultDatasetId}`);

  // Fetch dataset
  const dsUrl = apifyUrl(`/datasets/${run.defaultDatasetId}/items?limit=${handles.length + 5}&clean=true`, token);
  let dsRes: Response;
  try {
    dsRes = await fetch(dsUrl, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return { ...empty(), runId: run.id, error: `Dataset fetch error: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!dsRes.ok) {
    return { ...empty(), runId: run.id, error: `Dataset HTTP ${dsRes.status}` };
  }

  const items = await dsRes.json() as ApifyProfileItem[];
  if (!Array.isArray(items)) {
    return { ...empty(), runId: run.id, error: "Dataset response was not an array" };
  }

  console.log(`[ig-profile-fetch] got ${items.length} profiles from dataset`);

  const profiles = new Map<string, IgProfileData>();

  // Index returned items by handle
  for (const item of items) {
    const h = (item.username ?? "").toLowerCase().trim();
    if (!h) continue;

    const extraUrls: string[] = [];
    for (const eu of item.externalUrls ?? []) {
      if (eu.url) extraUrls.push(eu.url);
    }

    const bioUrls = item.biography ? extractUrlsFromBio(item.biography) : [];

    const primaryExternal = normalizeProfileExternalUrl(
      item.externalUrlShimmed ?? item.externalUrl ?? null,
    );

    profiles.set(h, {
      handle: h,
      externalUrl: primaryExternal,
      biography: item.biography ?? null,
      fullName: item.fullName ?? null,
      extraExternalUrls: Array.from(
        new Set([
          ...extraUrls,
          ...bioUrls,
          ...(item.externalUrl && item.externalUrl !== primaryExternal ? [item.externalUrl] : []),
        ]),
      ),
      found: true,
      error: null,
    });
  }

  // Fill not-found placeholders for handles Apify returned no data for
  for (const handle of handles) {
    const h = handle.toLowerCase().trim();
    if (!profiles.has(h)) {
      profiles.set(h, {
        handle: h,
        externalUrl: null,
        biography: null,
        fullName: null,
        extraExternalUrls: [],
        found: false,
        error: null,
      });
    }
  }

  return { profiles, apifyOk: true, runId: run.id, error: null };
}
