// lib/studios/styleseat/extract.ts
// Pulls StyleSeat operator listings via Apify web scraper.
// If APIFY_TOKEN is not set OR STYLESEAT_MOCK=true, returns mock operators.
//
// StyleSeat search URL format:
//   https://www.styleseat.com/{category-slug}/{city-slug}--{state-slug}
//   e.g. https://www.styleseat.com/braiders/houston--tx

import type { StyleSeatOperator, StyleSeatCategory, StyleSeatRunConfig, StyleSeatCrawlResult } from "./types";
import { STYLESEAT_CATEGORY_SLUGS } from "./types";

const APIFY_BASE = "https://api.apify.com/v2";
const WAIT_FOR_FINISH_SECS = 55;
const DEFAULT_AGGREGATOR_URL = "https://www.styleseat.com/m/";
const BLOCKED_PATH_PARTS = [
  "/appointments", "/my-account", "/login", "/blog", "/about", "/terms", "/privacy",
  "/help", "/support", "/careers", "/download", "/pro", "/join",
];

// ─── URL builders ─────────────────────────────────────────────────────────────

function buildSearchUrl(category: StyleSeatCategory, market: string, state: string): string {
  const catSlug   = STYLESEAT_CATEGORY_SLUGS[category];
  const citySlug  = market.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const stateSlug = state.toLowerCase().replace(/[^a-z]+/g, "-");
  return `https://www.styleseat.com/${catSlug}/${citySlug}--${stateSlug}`;
}

export function normalizeStyleSeatUrl(input: string): string {
  const url = new URL(input, DEFAULT_AGGREGATOR_URL);
  if (!/(\.|^)styleseat\.com$/i.test(url.hostname)) {
    throw new Error("Only styleseat.com URLs are supported");
  }
  url.protocol = "https:";
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.toLowerCase().startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
}

function classifyStyleSeatUrl(url: string): "profile" | "search" | "category" | "aggregator" | "unknown" {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  if (BLOCKED_PATH_PARTS.some((part) => pathname.toLowerCase().startsWith(part))) return "unknown";
  if (/^\/m\/[^/]+$/i.test(pathname)) return "profile";
  if (/^\/m\/?$/i.test(pathname)) return "aggregator";
  if (pathname.includes("/search/")) return "search";
  if (Object.values(STYLESEAT_CATEGORY_SLUGS).some((slug) => pathname.includes(`/${slug}/`) || pathname === `/${slug}`)) return "category";
  return "unknown";
}

function extractAnchorUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      urls.push(normalizeStyleSeatUrl(new URL(href, baseUrl).toString()));
    } catch {
      // non-StyleSeat URL
    }
  }
  return Array.from(new Set(urls));
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveCategories(text: string, fallback: StyleSeatCategory[]): StyleSeatCategory[] {
  const lower = text.toLowerCase();
  const hits: StyleSeatCategory[] = [];
  const checks: Array<[StyleSeatCategory, string[]]> = [
    ["hair", ["hair", "silk press", "color", "stylist"]],
    ["braids", ["braid", "knotless", "protective style"]],
    ["barber", ["barber", "fade", "beard"]],
    ["locs", ["loc", "retwist", "starter loc"]],
    ["makeup", ["makeup", "mua", "glam"]],
    ["lashes", ["lash", "extensions"]],
    ["brows", ["brow", "lamination", "threading"]],
    ["nails", ["nail", "acrylic", "manicure"]],
    ["extensions", ["extensions", "weave", "sew-in"]],
  ];
  for (const [category, needles] of checks) {
    if (needles.some((needle) => lower.includes(needle))) hits.push(category);
  }
  return hits.length > 0 ? hits : fallback.length > 0 ? fallback : ["hair"];
}

function deriveLocation(text: string, fallbackCity: string, fallbackState: string): { city: string; state: string } {
  const match = text.match(/\b([A-Z][a-zA-Z .'-]{2,40}),\s*([A-Z]{2})\b/);
  return {
    city: match?.[1]?.trim() || fallbackCity,
    state: match?.[2]?.trim() || fallbackState,
  };
}

function operatorFromProfileHtml(
  profileUrl: string,
  html: string,
  config: StyleSeatRunConfig,
  idx: number,
  seedUrl: string,
  batch: string,
): StyleSeatOperator {
  const rawText = textFromHtml(html).slice(0, 5000);
  const slug = new URL(profileUrl).pathname.split("/m/")[1]?.split("/")[0] || `profile-${idx + 1}`;
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = textFromHtml(h1Match?.[1] || titleMatch?.[1] || slug.replace(/[-_]+/g, " "))
    .replace(/\s*\|\s*StyleSeat.*$/i, "")
    .replace(/\s*-\s*StyleSeat.*$/i, "")
    .trim() || slug;
  const location = deriveLocation(rawText, config.market, config.state);
  const categories = deriveCategories(rawText, config.categories);
  const reviewMatch = rawText.match(/\b([0-9][0-9,]*)\s+reviews?\b/i);
  const ratingMatch = rawText.match(/\b([0-5](?:\.[0-9])?)\s*(?:stars?|rating)\b/i);
  const imageCount = (html.match(/<img\b/gi) ?? []).length;

  return {
    styleseatId: `ss-${slug}-${idx}`,
    name,
    slug,
    styleseatUrl: profileUrl,
    city: location.city,
    state: location.state,
    categories,
    specialties: categories,
    bio: rawText.slice(0, 300) || null,
    services: categories.map((category) => ({ name: category, price: null, duration: null })),
    reviewCount: reviewMatch ? Number(reviewMatch[1].replace(/,/g, "")) : 0,
    rating: ratingMatch ? Number(ratingMatch[1]) : null,
    imageUrl: null,
    priceRange: null,
    isIndependent: true,
    harvestDate: new Date().toISOString().slice(0, 10),
    batchId: batch,
    discoveryMode: config.discoveryMode ?? "market_search",
    seedUrl,
    sourceUrl: profileUrl,
    rawText,
    imageCount,
  };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AIH StyleSeat Discovery/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

export async function crawlStyleSeatDiscovery(input: {
  startUrl: string;
  crawlDepth: number;
  maxOperators: number;
  categories: StyleSeatCategory[];
}): Promise<StyleSeatCrawlResult> {
  const seedUrl = normalizeStyleSeatUrl(input.startUrl || DEFAULT_AGGREGATOR_URL);
  const queue: Array<{ url: string; depth: number }> = [{ url: seedUrl, depth: 0 }];
  const seen = new Set<string>();
  const crawledUrls: string[] = [];
  const profileUrls: string[] = [];
  const rejectedUrls: string[] = [];
  const discoveredMarkets = new Set<string>();
  const discoveredCategories = new Set<string>();

  while (queue.length > 0 && profileUrls.length < input.maxOperators) {
    const next = queue.shift()!;
    if (seen.has(next.url)) continue;
    seen.add(next.url);

    const kind = classifyStyleSeatUrl(next.url);
    if (kind === "unknown") {
      rejectedUrls.push(next.url);
      continue;
    }
    if (kind === "profile") {
      profileUrls.push(next.url);
      continue;
    }
    if (next.depth > input.crawlDepth) continue;

    let html = "";
    try {
      html = await fetchHtml(next.url);
      crawledUrls.push(next.url);
    } catch {
      rejectedUrls.push(next.url);
      continue;
    }

    const pageText = textFromHtml(html);
    const location = deriveLocation(pageText, "", "");
    if (location.city && location.state) discoveredMarkets.add(`${location.city}, ${location.state}`);
    for (const category of deriveCategories(pageText, input.categories)) discoveredCategories.add(category);

    for (const url of extractAnchorUrls(html, next.url)) {
      const urlKind = classifyStyleSeatUrl(url);
      if (urlKind === "profile" && profileUrls.length < input.maxOperators && !profileUrls.includes(url)) {
        profileUrls.push(url);
      } else if (["search", "category", "aggregator"].includes(urlKind) && next.depth + 1 <= input.crawlDepth && !seen.has(url)) {
        queue.push({ url, depth: next.depth + 1 });
      } else if (urlKind === "unknown") {
        rejectedUrls.push(url);
      }
    }
  }

  return {
    seedUrls: [seedUrl],
    crawledUrls: Array.from(new Set(crawledUrls)),
    profileUrls: Array.from(new Set(profileUrls)).slice(0, input.maxOperators),
    rejectedUrls: Array.from(new Set(rejectedUrls)).slice(0, 200),
    discoveredMarkets: Array.from(discoveredMarkets),
    discoveredCategories: Array.from(discoveredCategories),
  };
}

// ─── Apify helpers (mirrors apify-client.ts pattern) ─────────────────────────

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

// ─── PageFunction (runs inside Apify's headless browser) ─────────────────────
// Extracts operator cards from StyleSeat listing pages.
// StyleSeat renders via React; Apify's web-scraper uses Puppeteer.

const PAGE_FUNCTION = /* javascript */ `
async function pageFunction(context) {
  const { page, request, log } = context;

  // Wait for pro cards to render
  try {
    await page.waitForSelector('[data-test="pro-name"], .pro-card, [class*="ProCard"], h2, h3', { timeout: 8000 });
  } catch (e) {
    log.warning("Selector not found — page may have changed layout");
  }

  const html = await page.content();

  // Try to extract from JSON-LD (most reliable)
  const jsonLdMatches = html.match(/<script type="application\\/ld\\+json"[^>]*>([\\s\\S]*?)<\\/script>/gi) || [];
  const ldPersons = [];
  for (const block of jsonLdMatches) {
    try {
      const inner = block.replace(/<script[^>]*>/, "").replace(/<\\/script>/, "");
      const parsed = JSON.parse(inner);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item["@type"] === "Person" || item["@type"] === "LocalBusiness") {
          ldPersons.push(item);
        }
      }
    } catch (e) {}
  }

  const results = [];
  const sourceUrl = request.url;

  // Extract from JSON-LD
  for (const person of ldPersons.slice(0, 30)) {
    const name = person.name || person.givenName || "";
    const slug = (person.url || "").split("/m/")[1]?.split("?")[0] || "";
    if (!name || !slug) continue;
    const address = person.address || {};
    results.push({
      name: name.trim(),
      slug: slug.trim(),
      styleseatUrl: "https://www.styleseat.com/m/" + slug,
      city: address.addressLocality || "",
      state: address.addressRegion || "",
      bio: person.description || null,
      reviewCount: person.aggregateRating?.reviewCount || 0,
      rating: person.aggregateRating?.ratingValue || null,
      imageUrl: person.image?.url || person.image || null,
      specialties: person.knowsAbout || [],
      sourceUrl,
    });
  }

  // Fallback: DOM extraction if JSON-LD empty
  if (results.length === 0) {
    const cards = await page.$$('[data-pro-slug], [data-test="pro-card"], [class*="pro-card"], [class*="ProCard"]');
    for (const card of cards.slice(0, 30)) {
      try {
        const name = await card.$eval('[data-test="pro-name"], [class*="pro-name"], h2, h3', el => el.textContent?.trim() || "").catch(() => "");
        const href = await card.$eval("a[href*='/m/']", el => el.getAttribute("href") || "").catch(() => "");
        const slug = href.split("/m/")[1]?.split("?")[0] || "";
        const reviewText = await card.$eval('[data-test="review-count"], [class*="review"]', el => el.textContent?.trim() || "0").catch(() => "0");
        const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, "")) || 0;
        const ratingText = await card.$eval('[class*="rating"], [class*="star"]', el => el.getAttribute("aria-label") || el.textContent?.trim() || "").catch(() => "");
        const rating = parseFloat(ratingText.replace(/[^0-9.]/g, "")) || null;
        const imageUrl = await card.$eval("img", el => el.getAttribute("src") || null).catch(() => null);

        if (name && slug) {
          results.push({
            name, slug,
            styleseatUrl: "https://www.styleseat.com/m/" + slug,
            city: "", state: "", bio: null,
            reviewCount, rating, imageUrl,
            specialties: [],
            sourceUrl,
          });
        }
      } catch (e) {}
    }
  }

  return results;
}
`;

// ─── Main extract function ────────────────────────────────────────────────────

export interface StyleSeatExtractResult {
  operators: StyleSeatOperator[];
  actorRunId: string | null;
  error: string | null;
  crawl?: StyleSeatCrawlResult | null;
}

export async function runStyleSeatHarvest(
  config: StyleSeatRunConfig,
): Promise<StyleSeatExtractResult> {
  const discoveryMode = config.discoveryMode ?? "market_search";
  const maxOperators = config.maxOperators ?? config.maxResults;
  const crawlDepth = config.crawlDepth ?? 2;

  // Dev mock mode
  if (process.env.STYLESEAT_MOCK === "true" || !process.env.APIFY_TOKEN) {
    const reason = !process.env.APIFY_TOKEN
      ? "APIFY_TOKEN not set — mock operators returned"
      : "STYLESEAT_MOCK=true — mock operators returned";
    console.warn(`[styleseat/extract] ${reason}`);
    return {
      operators: generateMockOperators({ ...config, maxResults: maxOperators }),
      actorRunId: null,
      error: `⚠️ ${reason}`,
      crawl: mockCrawl(config),
    };
  }

  if (discoveryMode === "aggregator_crawl" || discoveryMode === "direct_url") {
    const startUrl = config.sourceUrl || DEFAULT_AGGREGATOR_URL;
    let crawl: StyleSeatCrawlResult;
    try {
      crawl = await crawlStyleSeatDiscovery({
        startUrl,
        crawlDepth,
        maxOperators,
        categories: config.categories,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { operators: [], actorRunId: null, error: `StyleSeat crawl failed: ${msg}`, crawl: null };
    }

    const batch = `styleseat-crawl-${Date.now()}`;
    const operators: StyleSeatOperator[] = [];
    for (const profileUrl of crawl.profileUrls.slice(0, maxOperators)) {
      try {
        const html = await fetchHtml(profileUrl);
        operators.push(operatorFromProfileHtml(profileUrl, html, config, operators.length, crawl.seedUrls[0], batch));
      } catch {
        // keep crawling results inspectable even if one profile fails
      }
    }

    return {
      operators,
      actorRunId: null,
      error: operators.length === 0 ? "StyleSeat crawl found no extractable profiles" : null,
      crawl,
    };
  }

  const token = process.env.APIFY_TOKEN!;

  const startUrls = config.categories.map((cat) => ({
    url: buildSearchUrl(cat, config.market, config.state),
    metadata: { category: cat },
  }));

  const runPayload = {
    startUrls,
    pageFunction: PAGE_FUNCTION,
    maxRequestsPerCrawl: Math.max(config.categories.length * 3, 10),
    maxConcurrency: 2,
    waitUntil: "networkidle2",
  };

  // Start Apify web-scraper run
  let runRes: Response;
  try {
    runRes = await apifyFetch(
      apifyUrl(`/acts/apify~web-scraper/runs?waitForFinish=${WAIT_FOR_FINISH_SECS}`, token),
      { method: "POST", body: JSON.stringify(runPayload) },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[styleseat/extract] Apify network error:", msg);
    return { operators: generateMockOperators(config), actorRunId: null, error: `Apify network error: ${msg}` };
  }

  if (!runRes.ok) {
    const text = await runRes.text().catch(() => "");
    console.error(`[styleseat/extract] Apify HTTP ${runRes.status}:`, text.slice(0, 200));
    return {
      operators: generateMockOperators(config),
      actorRunId: null,
      error: `Apify HTTP ${runRes.status}: ${text.slice(0, 120)}`,
    };
  }

  const runData = await runRes.json() as { data?: { id: string; status: string; defaultDatasetId: string } };
  const runId = runData.data?.id;
  const datasetId = runData.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    return { operators: generateMockOperators(config), actorRunId: null, error: "Apify: unexpected run response shape" };
  }

  // Fetch dataset items
  const datasetRes = await apifyFetch(
    apifyUrl(`/datasets/${datasetId}/items?limit=${config.maxResults * config.categories.length * 2}&clean=true`, token),
  );

  if (!datasetRes.ok) {
    return { operators: generateMockOperators(config), actorRunId: runId, error: `Apify dataset fetch HTTP ${datasetRes.status}` };
  }

  const rawItems = await datasetRes.json() as Record<string, unknown>[];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { operators: generateMockOperators(config), actorRunId: runId, error: "Apify returned 0 items — check search URLs and page function" };
  }

  const now   = new Date().toISOString().slice(0, 10);
  const batch = `styleseat-batch-${Date.now()}`;

  const operators: StyleSeatOperator[] = rawItems
    .slice(0, maxOperators)
    .map((item, idx): StyleSeatOperator | null => {
      const name = String(item.name ?? "").trim();
      const slug = String(item.slug ?? "").trim();
      if (!name || !slug) return null;

      // Infer category from source URL
      const sourceUrl = String(item.sourceUrl ?? "");
      const category = config.categories.find((c) => sourceUrl.includes(STYLESEAT_CATEGORY_SLUGS[c]))
        ?? config.categories[idx % config.categories.length];

      return {
        styleseatId:  `ss-${slug}-${idx}`,
        name,
        slug,
        styleseatUrl: String(item.styleseatUrl ?? `https://www.styleseat.com/m/${slug}`),
        city:  String(item.city  ?? config.market),
        state: String(item.state ?? config.state),
        categories:  [category],
        specialties: Array.isArray(item.specialties) ? item.specialties.map(String) : [],
        bio:         item.bio ? String(item.bio).slice(0, 300) : null,
        services:    [],
        reviewCount: Number(item.reviewCount ?? 0),
        rating:      item.rating != null ? Number(item.rating) : null,
        imageUrl:    item.imageUrl ? String(item.imageUrl) : null,
        priceRange:  null,
        isIndependent: true,
        harvestDate: now,
        batchId:     batch,
        discoveryMode,
        seedUrl: sourceUrl,
        sourceUrl,
        rawText: String(item.bio ?? ""),
        imageCount: item.imageUrl ? 1 : 0,
      };
    })
    .filter((op): op is StyleSeatOperator => op !== null);

  return {
    operators,
    actorRunId: runId,
    error: null,
    crawl: {
      seedUrls: startUrls.map((s) => s.url),
      crawledUrls: startUrls.map((s) => s.url),
      profileUrls: operators.map((op) => op.styleseatUrl),
      rejectedUrls: [],
      discoveredMarkets: Array.from(new Set(operators.map((op) => `${op.city}, ${op.state}`))),
      discoveredCategories: Array.from(new Set(operators.flatMap((op) => op.categories))),
    },
  };
}

function mockCrawl(config: StyleSeatRunConfig): StyleSeatCrawlResult {
  const seed = config.sourceUrl || DEFAULT_AGGREGATOR_URL;
  const operators = generateMockOperators(config);
  return {
    seedUrls: [seed],
    crawledUrls: [seed],
    profileUrls: operators.map((op) => op.styleseatUrl),
    rejectedUrls: [],
    discoveredMarkets: Array.from(new Set(operators.map((op) => `${op.city}, ${op.state}`))),
    discoveredCategories: Array.from(new Set(operators.flatMap((op) => op.categories))),
  };
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_OPERATORS_POOL: Array<{ name: string; specialties: string[]; bio: string }> = [
  { name: "Janelle Carter",    specialties: ["knotless braids", "faux locs"],    bio: "Natural hair specialist. Braids, twists, protective styles in Houston." },
  { name: "Aisha Williams",    specialties: ["box braids", "senegalese twists"], bio: "Certified braider. 10+ yrs experience. Book online." },
  { name: "Destiny Brown",     specialties: ["sew-in", "quickweave"],            bio: "Versatile hair stylist. All textures welcome." },
  { name: "Keisha Thompson",   specialties: ["loc maintenance", "retwist"],       bio: "Loc specialist and natural hair educator." },
  { name: "Monique Davis",     specialties: ["color", "balayage"],               bio: "Color expert. Specializing in lived-in looks and blonding." },
  { name: "Tanya Robinson",    specialties: ["lash extensions", "brow lamination"], bio: "Lash & brow artist. Licensed aesthetician." },
  { name: "Shanice Johnson",   specialties: ["acrylic nails", "nail art"],        bio: "Nail tech. Creative designs. Appointments only." },
  { name: "Brianna Wilson",    specialties: ["knotless braids", "tribal braids"], bio: "Braiding since 2017. IG: @briannabraid" },
  { name: "Latoya Anderson",   specialties: ["cut & color", "natural hair"],      bio: "Natural texture specialist serving the community." },
  { name: "Dominique Harris",  specialties: ["makeup", "bridal glam"],           bio: "MUA for all skin tones. Bridal + editorial." },
  { name: "Niesha Davis Beauty", specialties: ["lashes", "brows"],               bio: "Lash studio owner. Glam for everyday & events." },
  { name: "Tamika Flowers",    specialties: ["starter locs", "loc retwist"],      bio: "Loc journey specialist. DM to start yours." },
  { name: "Chantel Moore",     specialties: ["silk press", "natural blowout"],    bio: "Hair care educator. Soft, bouncy silk presses." },
  { name: "Jasmine Cruz",      specialties: ["wax", "threading"],                bio: "Esthetician. Full body wax + brow shaping." },
  { name: "Simone Carter Studio", specialties: ["braids", "protective styles"],  bio: "Suite-based studio. All braiding styles." },
];

function generateMockOperators(config: StyleSeatRunConfig): StyleSeatOperator[] {
  const now   = new Date().toISOString().slice(0, 10);
  const batch = `styleseat-mock-${Date.now()}`;
  const cap   = Math.min(config.maxOperators ?? config.maxResults, MOCK_OPERATORS_POOL.length);

  return MOCK_OPERATORS_POOL.slice(0, cap).map((tmpl, i): StyleSeatOperator => {
    const category = config.categories[i % Math.max(config.categories.length, 1)] ?? "hair";
    const slug     = tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const reviews  = 5 + (i * 7) + (i % 3) * 11;
    const rating   = Number((4.3 + (i % 4) * 0.15).toFixed(1));

    return {
      styleseatId:  `ss-mock-${i + 1}`,
      name:         tmpl.name,
      slug,
      styleseatUrl: `https://www.styleseat.com/m/${slug}`,
      city:         config.market,
      state:        config.state || "TX",
      categories:   [category],
      specialties:  tmpl.specialties,
      bio:          tmpl.bio,
      services:     [
        { name: category === "braids" ? "Box Braids (Med)" : "Signature Service", price: 80 + i * 10, duration: 90 },
        { name: "Consultation", price: 0, duration: 15 },
      ],
      reviewCount:  reviews,
      rating,
      imageUrl:     null,
      priceRange:   `$${70 + i * 5}–$${140 + i * 10}`,
      isIndependent: true,
      harvestDate:  now,
      batchId:      batch,
      discoveryMode: config.discoveryMode ?? "market_search",
      seedUrl:      config.sourceUrl ?? DEFAULT_AGGREGATOR_URL,
      sourceUrl:    config.sourceUrl ?? DEFAULT_AGGREGATOR_URL,
      rawText:      tmpl.bio,
      imageCount:   0,
    };
  });
}
