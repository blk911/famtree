// lib/intelligence/salon/provider-validation/fetch-public-url.ts

const FETCH_TIMEOUT_MS = 6_000;
const MAX_BYTES = 750_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type PublicUrlFetchResult = {
  ok: boolean;
  httpStatus: number;
  finalUrl: string;
  body: string;
  timedOut: boolean;
  fetchError: boolean;
  blocked: boolean;
};

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

export function assertPublicHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return !isPrivateOrLocalHost(u.hostname);
  } catch {
    return false;
  }
}

async function readBodyLimited(res: Response): Promise<string> {
  try {
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return "";
  }
}

export async function fetchPublicProviderUrl(url: string): Promise<PublicUrlFetchResult> {
  if (!assertPublicHttpUrl(url)) {
    return {
      ok: false,
      httpStatus: 0,
      finalUrl: url,
      body: "",
      timedOut: false,
      fetchError: true,
      blocked: false,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml",
  };

  try {
    let res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers,
      redirect: "follow",
    });
    clearTimeout(timer);
    const finalUrl = res.url || url;
    const httpStatus = res.status;
    if (httpStatus === 403 || httpStatus === 429) {
      return {
        ok: false,
        httpStatus,
        finalUrl,
        body: "",
        timedOut: false,
        fetchError: false,
        blocked: true,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        httpStatus,
        finalUrl,
        body: "",
        timedOut: false,
        fetchError: false,
        blocked: false,
      };
    }
    const body = await readBodyLimited(res);
    return {
      ok: true,
      httpStatus,
      finalUrl,
      body,
      timedOut: false,
      fetchError: false,
      blocked: false,
    };
  } catch (e) {
    clearTimeout(timer);
    const timedOut = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      httpStatus: 0,
      finalUrl: url,
      body: "",
      timedOut,
      fetchError: !timedOut,
      blocked: false,
    };
  }
}

export function titleFromHtml(body: string): string {
  const m = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}

export function scanMarkers(
  body: string,
  title: string,
  positive: Array<{ id: string; re: RegExp }>,
  negative: Array<{ id: string; re: RegExp }>,
): { positive: string[]; negative: string[] } {
  const hay = `${body} ${title}`.toLowerCase();
  return {
    positive: positive.filter((p) => p.re.test(hay)).map((p) => p.id),
    negative: negative.filter((p) => p.re.test(hay)).map((p) => p.id),
  };
}
