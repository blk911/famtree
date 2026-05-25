// lib/studios/creator-lab/extract-signals.ts
// Extracts structured signals from raw CreatorSource without an AI call.
// Pure regex + heuristics — no DOM library required.

import type { CreatorSource, CreatorSignalSet, ProductSignal, CollectionSignal, EventSignal } from "./types";
import { extractHandle } from "./url-utils";

// ─── Pattern sets ─────────────────────────────────────────────────────────────

const PRICE_RE   = /\$\d[\d,]*(?:\.\d{2})?|\d+(?:\.\d{2})?\s?(?:USD|GBP|EUR|AUD)/gi;
const EMAIL_RE   = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const HASHTAG_RE = /#[a-zA-Z]\w{2,}/g;

const COMMISSION_KEYWORDS = [
  "commission", "commissions", "custom order", "custom orders", "bespoke", "made to order",
  "contact for custom", "dm to commission", "open for commissions",
];
const CLASS_KEYWORDS = [
  "workshop", "class", "classes", "course", "tutorial", "lessons", "lesson", "teach",
  "teaching", "join me", "register", "enroll", "enroll now", "book a class",
];
const PRODUCT_SECTION_KEYWORDS = [
  "shop", "store", "buy", "add to cart", "sold", "available", "listing", "listings",
  "in stock", "ships", "shipping",
];
const BIO_KEYWORDS = [
  "artist", "maker", "creator", "designer", "illustrator", "painter", "sculptor",
  "ceramicist", "potter", "jeweler", "jewellery", "trainer", "coach", "instructor",
  "i make", "i create", "i design", "i paint", "based in", "studio",
];
const EVENT_DATE_RE = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{1,2}(?:[\s,]+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function extractPrices(texts: string[]): string[] {
  const found: string[] = [];
  for (const t of texts) {
    const matches = t.match(PRICE_RE);
    if (matches) found.push(...matches);
  }
  return Array.from(new Set(found));
}

function extractSocialText(blocks: string[]): string[] {
  return blocks.filter((b) => {
    const lower = b.toLowerCase();
    return (
      HASHTAG_RE.test(b) ||
      lower.includes("follow") ||
      lower.includes("link in bio") ||
      lower.includes("swipe") ||
      lower.includes("tap to") ||
      lower.includes("double tap") ||
      lower.includes("tag a friend")
    );
  });
}

function extractBioCandidates(blocks: string[]): string[] {
  const scored = blocks.map((b) => {
    let score = 0;
    if (hasKeyword(b, BIO_KEYWORDS)) score += 3;
    if (b.length > 50 && b.length < 400) score += 2;
    if (/^[A-Z]/.test(b)) score += 1;
    if (/\bI\b/.test(b)) score += 1;
    if (EMAIL_RE.test(b)) score -= 2;
    return { b, score };
  });
  return scored
    .filter((s) => s.score > 2)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.b)
    .slice(0, 6);
}

function extractProductSignals(blocks: string[], imageUrls: string[]): ProductSignal[] {
  const products: ProductSignal[] = [];
  let imgIdx = 0;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (!hasKeyword(b, PRODUCT_SECTION_KEYWORDS)) continue;

    const prices = b.match(PRICE_RE);
    const next = blocks[i + 1] ?? "";

    // Heuristic: short block with price looks like a product title
    if (prices && b.length < 120) {
      products.push({
        title:       b.replace(PRICE_RE, "").trim().slice(0, 80),
        price:       prices[0],
        description: next.length > 20 && next.length < 300 ? next : null,
        imageUrl:    imageUrls[imgIdx++] ?? null,
        pageUrl:     null,
      });
    }

    if (products.length >= 20) break;
  }

  return products;
}

function extractCollectionSignals(blocks: string[], links: string[]): CollectionSignal[] {
  const collections: CollectionSignal[] = [];
  const seen = new Set<string>();

  // Look for blocks that name a collection or category
  for (const b of blocks) {
    const lower = b.toLowerCase();
    if (
      (lower.includes("collection") || lower.includes("series") || lower.includes("range")) &&
      b.length < 80 &&
      !seen.has(b)
    ) {
      seen.add(b);
      const countMatch = b.match(/(\d+)\s+(?:piece|item|work|print)/i);
      collections.push({
        name:        b.trim(),
        itemCount:   countMatch ? parseInt(countMatch[1], 10) : null,
        description: null,
      });
    }
    if (collections.length >= 10) break;
  }

  // Also scan link text for collection-like paths (/collections/xxx on Shopify)
  for (const link of links) {
    const m = link.match(/\/collections\/([a-z0-9-]+)/i);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      collections.push({
        name:        m[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        itemCount:   null,
        description: null,
      });
    }
    if (collections.length >= 15) break;
  }

  return collections;
}

function extractEventSignals(blocks: string[]): EventSignal[] {
  const events: EventSignal[] = [];
  for (const b of blocks) {
    if (!hasKeyword(b, ["event", "workshop", "fair", "market", "exhibition", "show", "opening", "gallery", "class"])) continue;
    const dateMatch = b.match(EVENT_DATE_RE);
    const locationMatch = b.match(/(?:at|@|in)\s+([A-Z][a-zA-Z\s]{3,40})/);
    events.push({
      title:    b.slice(0, 120),
      date:     dateMatch ? dateMatch[0] : null,
      location: locationMatch ? locationMatch[1].trim() : null,
      url:      null,
    });
    if (events.length >= 8) break;
  }
  return events;
}

function extractExternalLinks(links: string[], sourceHostname: string): string[] {
  return links.filter((l) => {
    try {
      const u = new URL(l);
      return (
        u.hostname !== sourceHostname &&
        !u.hostname.includes("google") &&
        !u.hostname.includes("facebook") &&
        !u.hostname.includes("twitter") &&
        !u.hostname.includes("cdn") &&
        !u.hostname.includes("static") &&
        u.protocol.startsWith("http")
      );
    } catch {
      return false;
    }
  }).slice(0, 20);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function extractSignals(source: CreatorSource): CreatorSignalSet {
  const { rawTextBlocks, links, imageUrls, platform, normalizedUrl } = source;

  let sourceHostname = "";
  try { sourceHostname = new URL(normalizedUrl).hostname; } catch {}

  const handle = extractHandle(normalizedUrl, platform);

  // Bio candidates — top-scored text blocks
  const bioCandidates = extractBioCandidates(rawTextBlocks);

  // Creator name heuristic — first block that looks like a name (1–4 words, title-cased)
  const nameCandidates = rawTextBlocks.filter((b) => {
    const words = b.trim().split(/\s+/);
    return (
      words.length >= 1 &&
      words.length <= 5 &&
      /^[A-Z]/.test(b) &&
      !/\$|\.com|https?/.test(b)
    );
  });
  const creatorName = nameCandidates[0] ?? null;

  const commissionSignals = rawTextBlocks.filter((b) => hasKeyword(b, COMMISSION_KEYWORDS));
  const classWorkshopSignals = rawTextBlocks.filter((b) => hasKeyword(b, CLASS_KEYWORDS));
  const socialTextSignals = extractSocialText(rawTextBlocks);
  const productSignals = extractProductSignals(rawTextBlocks, imageUrls);
  const collectionSignals = extractCollectionSignals(rawTextBlocks, links);
  const eventSignals = extractEventSignals(rawTextBlocks);
  const externalLinks = extractExternalLinks(links, sourceHostname);

  // Evidence: top text blocks used for signal extraction
  const evidence = [
    ...bioCandidates.slice(0, 3),
    ...commissionSignals.slice(0, 2),
    ...classWorkshopSignals.slice(0, 2),
    ...socialTextSignals.slice(0, 2),
  ].filter(Boolean).slice(0, 12);

  return {
    creatorName,
    handle,
    bioCandidates,
    externalLinks,
    imageUrls: imageUrls.slice(0, 30),
    productSignals,
    collectionSignals,
    eventSignals,
    commissionSignals: commissionSignals.slice(0, 5),
    classWorkshopSignals: classWorkshopSignals.slice(0, 5),
    socialTextSignals: socialTextSignals.slice(0, 10),
    evidence,
  };
}
