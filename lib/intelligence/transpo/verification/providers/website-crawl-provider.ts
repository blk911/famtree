// lib/intelligence/transpo/verification/providers/website-crawl-provider.ts
// Low-volume, time-limited public-website crawler for carrier verification.
// Fetches the homepage + a few likely internal pages (contact/careers/etc.),
// extracts title/description/phones/emails, and detects transport-relevant
// content signals. HTML only — no JS rendering, no form submission. Never throws.

import type { TranspoCarrierTarget } from "../../types";
import type {
  TranspoCarrierVerification,
  TranspoWebsiteSignal,
} from "../../verification-types";

const USER_AGENT = "AIH-Transpo-Verification/1.0";
const REQUEST_TIMEOUT_MS = 8000;
const TOTAL_CRAWL_TIMEOUT_MS = 25000;
const MAX_PAGES = 4;
const MAX_DISCOVERED = 3;
const MAX_BYTES = 1024 * 1024; // 1MB

// Candidate internal paths to discover/visit beyond the homepage.
const CANDIDATE_PATHS = [
  "/contact",
  "/contact-us",
  "/careers",
  "/jobs",
  "/drivers",
  "/owner-operators",
  "/owner-operator",
  "/services",
  "/about",
];

// ── URL safety ─────────────────────────────────────────────────────────────────

function normalizeUrl(raw: string | undefined | null): URL | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

/** Block localhost, private ranges, and internal-only hostnames. */
function isPublicHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (h === "::1" || h === "0.0.0.0") return false;
  // IPv4 private / loopback / link-local ranges.
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return false;
    if (a === 192 && b === 168) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 169 && b === 254) return false;
  }
  return true;
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

type FetchResult = { ok: boolean; status: number; finalUrl: string; html: string; error?: string };

async function fetchHtml(url: string, deadline: number): Promise<FetchResult> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return { ok: false, status: 0, finalUrl: url, html: "", error: "crawl time budget exhausted" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(REQUEST_TIMEOUT_MS, remaining));
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    });
    const finalUrl = res.url || url;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html") && ct !== "") {
      return { ok: false, status: res.status, finalUrl, html: "", error: `non-HTML content-type: ${ct}` };
    }
    // Read with a byte cap so we never buffer huge responses.
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (received >= MAX_BYTES) {
          await reader.cancel().catch(() => {});
          break;
        }
      }
      html += decoder.decode();
    } else {
      html = (await res.text()).slice(0, MAX_BYTES);
    }
    return { ok: res.ok, status: res.status, finalUrl, html };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "request timed out" : e.message) : String(e);
    return { ok: false, status: 0, finalUrl: url, html: "", error: msg };
  } finally {
    clearTimeout(timer);
  }
}

// ── HTML parsing (regex-based; no DOM) ──────────────────────────────────────────

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].trim()).slice(0, 200) : undefined;
}

function extractMetaDescription(html: string): string | undefined {
  const m =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return m ? decodeEntities(m[1].trim()).slice(0, 400) : undefined;
}

function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractEmails(text: string): string[] {
  const found = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  return Array.from(new Set(found.map((e) => e.toLowerCase())))
    .filter((e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e))
    .slice(0, 10);
}

function extractPhones(text: string): string[] {
  const found = text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) ?? [];
  const normalized = found
    .map((p) => p.replace(/\D/g, ""))
    .map((d) => (d.length === 11 && d.startsWith("1") ? d.slice(1) : d))
    .filter((d) => d.length === 10);
  return Array.from(new Set(normalized)).slice(0, 10);
}

function extractInternalLinks(html: string, base: URL): string[] {
  const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map((m) => m[1]);
  const out = new Set<string>();
  for (const href of hrefs) {
    try {
      const u = new URL(href, base);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
      u.hash = "";
      out.add(u.toString());
    } catch {
      // ignore malformed hrefs
    }
  }
  return Array.from(out);
}

// ── Signal detection ────────────────────────────────────────────────────────────

const SIGNAL_PATTERNS: { signal: TranspoWebsiteSignal; re: RegExp }[] = [
  { signal: "hiring_language", re: /\b(now hiring|we'?re hiring|drivers? wanted|cdl|join our team|careers|apply now|job openings)\b/i },
  { signal: "owner_operator_language", re: /\b(owner[\s-]?operators?|lease[\s-]?purchase|independent contractor|lease to own)\b/i },
  { signal: "quote_request", re: /\b(request a quote|get a quote|quote request|shipping quote|free quote|get a free quote)\b/i },
  { signal: "service_area", re: /\b(service area|lanes|regional|nationwide|dedicated lanes|coverage area|48 states)\b/i },
  { signal: "equipment_language", re: /\b(fleet|trailers?|trucks?|reefer|flatbed|dry van|tanker|step ?deck|power units?)\b/i },
  { signal: "safety_language", re: /\b(safety|compliance|fmcsa|dot compliant|csa score|safety rating)\b/i },
];

const PARKED_RE =
  /\b(domain (is )?for sale|buy this domain|this domain is parked|parked (free|domain)|sedoparking|sedo\.com|godaddy\b[^.]*parking|hugedomains|domain parking|future home of)\b/i;

function detectTextSignals(text: string): Set<TranspoWebsiteSignal> {
  const found = new Set<TranspoWebsiteSignal>();
  for (const { signal, re } of SIGNAL_PATTERNS) {
    if (re.test(text)) found.add(signal);
  }
  if (PARKED_RE.test(text)) found.add("parked_domain");
  return found;
}

function classifyPagePath(path: string): TranspoWebsiteSignal | null {
  const p = path.toLowerCase();
  if (/(contact)/.test(p)) return "contact_page_found";
  if (/(careers|jobs|drivers|hiring)/.test(p)) return "careers_page_found";
  return null;
}

// ── Crawler ──────────────────────────────────────────────────────────────────────

function pickStartUrl(
  carrier: TranspoCarrierTarget,
  verification?: Partial<TranspoCarrierVerification>,
): string | null {
  const candidates = [
    (carrier.website ?? "").trim(),
    (verification?.googleWebsite ?? "").trim(),
    (verification?.websiteUrl ?? "").trim(),
  ];
  return candidates.find((c) => c) || null;
}

export async function crawlCarrierWebsite(
  carrier: TranspoCarrierTarget,
  verification?: Partial<TranspoCarrierVerification>,
): Promise<Partial<TranspoCarrierVerification>> {
  const now = new Date().toISOString();
  const startRaw = pickStartUrl(carrier, verification);

  if (!startRaw) {
    return {
      websiteFetchStatus: "not_attempted",
      notes: ["No website available for crawl."],
      providersChecked: ["website"],
    };
  }

  const startUrl = normalizeUrl(startRaw);
  if (!startUrl || !isPublicHost(startUrl.hostname)) {
    return {
      websiteFetchStatus: "blocked",
      websiteFinalUrl: startRaw,
      websiteSignals: [],
      notes: [`Website crawl blocked: ${startUrl ? "non-public host" : "invalid URL"} (${startRaw}).`],
      websiteLastFetchedAt: now,
      providersChecked: ["website"],
    };
  }

  const deadline = Date.now() + TOTAL_CRAWL_TIMEOUT_MS;
  const signals = new Set<TranspoWebsiteSignal>();
  const phones = new Set<string>();
  const emails = new Set<string>();
  const pagesChecked: string[] = [];
  const notes: string[] = [];

  // 1) Homepage.
  const home = await fetchHtml(startUrl.toString(), deadline);
  pagesChecked.push(startUrl.toString());

  if (!home.ok || !home.html) {
    signals.add("broken_site");
    return {
      websiteFetchStatus: "failed",
      websiteHttpStatus: home.status || undefined,
      websiteFinalUrl: home.finalUrl,
      websiteSignals: Array.from(signals),
      websitePagesChecked: pagesChecked,
      websiteLastFetchedAt: now,
      notes: [`Website crawl failed: ${home.error ?? `HTTP ${home.status}`}.`],
      providersChecked: ["website"],
    };
  }

  signals.add("homepage_found");
  const finalBase = normalizeUrl(home.finalUrl) ?? startUrl;
  const homeText = stripToText(home.html);
  const title = extractTitle(home.html);
  const description = extractMetaDescription(home.html);

  detectTextSignals(homeText).forEach((s) => signals.add(s));
  extractPhones(homeText).forEach((p) => phones.add(p));
  extractEmails(homeText).forEach((e) => emails.add(e));

  // If the homepage looks parked, stop early — no point crawling further.
  const looksParked = signals.has("parked_domain");

  // 2) Discover internal links and prioritize candidate pages.
  let discovered: string[] = [];
  if (!looksParked) {
    const internal = extractInternalLinks(home.html, finalBase);
    const prioritized = internal.filter((u) => {
      try {
        const path = new URL(u).pathname.toLowerCase();
        return CANDIDATE_PATHS.some((c) => path === c || path.startsWith(`${c}/`) || path.startsWith(`${c}-`));
      } catch {
        return false;
      }
    });
    // Fall back to constructing candidate paths if none were linked.
    const constructed = CANDIDATE_PATHS.map((p) => {
      try {
        return new URL(p, finalBase).toString();
      } catch {
        return null;
      }
    }).filter((u): u is string => Boolean(u));

    discovered = Array.from(new Set([...prioritized, ...constructed]))
      .filter((u) => !pagesChecked.includes(u))
      .slice(0, MAX_DISCOVERED);
  }

  // 3) Fetch up to MAX_DISCOVERED internal pages (respecting the page cap).
  for (const pageUrl of discovered) {
    if (pagesChecked.length >= MAX_PAGES) break;
    if (Date.now() >= deadline) {
      notes.push("Crawl stopped early: time budget reached.");
      break;
    }
    const page = await fetchHtml(pageUrl, deadline);
    pagesChecked.push(pageUrl);
    if (!page.ok || !page.html) continue;

    const pathSignal = classifyPagePath(new URL(pageUrl).pathname);
    if (pathSignal) signals.add(pathSignal);

    const text = stripToText(page.html);
    detectTextSignals(text).forEach((s) => signals.add(s));
    extractPhones(text).forEach((p) => phones.add(p));
    extractEmails(text).forEach((e) => emails.add(e));
  }

  const hiringFound = signals.has("hiring_language") || signals.has("careers_page_found");
  const ownerOperatorFound = signals.has("owner_operator_language");
  const quoteRequestFound = signals.has("quote_request");

  const status: TranspoCarrierVerification["websiteFetchStatus"] = looksParked
    ? "fetched"
    : pagesChecked.length > 1
      ? "fetched"
      : "partial";

  notes.push(
    looksParked
      ? "Website appears to be a parked/for-sale domain."
      : `Crawled ${pagesChecked.length} page(s); ${signals.size} signal(s) detected.`,
  );

  return {
    websiteFetchStatus: status,
    websiteHttpStatus: home.status,
    websiteFinalUrl: home.finalUrl,
    websiteTitle: title,
    websiteDescription: description,
    websiteSignals: Array.from(signals),
    websitePagesChecked: pagesChecked,
    websiteExtractedPhones: Array.from(phones),
    websiteExtractedEmails: Array.from(emails),
    websiteHiringFound: hiringFound,
    websiteOwnerOperatorFound: ownerOperatorFound,
    websiteQuoteRequestFound: quoteRequestFound,
    websiteLastFetchedAt: now,
    notes,
    providersChecked: ["website"],
  };
}
