// lib/studios/creator-lab/enrich-creator.ts
// AI enrichment layer — takes raw signals and returns a fully assembled studio profile.
// Uses OpenAI gpt-4o-mini for cost efficiency on internal tooling.

import OpenAI from "openai";
import type {
  CreatorSignalSet,
  CreatorSource,
  AssembledCreatorStudio,
  CreatorIdentity,
  StyleProfile,
  MonetizationProfile,
  AssembledCollection,
  CreatorVertical,
  AssemblyConfidence,
} from "./types";
import { generateCreatorId } from "./url-utils";

// Lazy singleton — instantiated on first call, not at module load time.
// This prevents Vercel build from failing when OPENAI_API_KEY is a runtime-only env var.
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ─── Prompt builder ────────────────────────────────────────────────────────────

function buildEnrichmentPrompt(source: CreatorSource, signals: CreatorSignalSet, pastedContext?: string): string {
  const lines: string[] = [
    `You are the Studio Assembler AI for AIH Studios — an internal lab that reconstructs creator/artist profiles from public web signals.`,
    ``,
    `SOURCE URL: ${source.sourceUrl}`,
    `PLATFORM: ${source.platform}`,
    source.htmlLength === 0 && !pastedContext
      ? `NOTE: This platform (${source.platform}) blocks automated access. Only the URL/handle is available. Infer what you can from the handle and platform context; use null for anything you cannot determine. Set confidence to "low".`
      : ``,
    pastedContext
      ? `=== ADMIN-PASTED PROFILE INFO (treat as high-signal ground truth) ===\n${pastedContext}\n===`
      : ``,
    ``,
    `=== EXTRACTED SIGNALS ===`,
    ``,
    `Creator name candidates: ${signals.creatorName ?? "(none detected)"}`,
    `Handle: ${signals.handle ?? "(none)"}`,
    ``,
    `Bio candidates (best first):`,
    ...signals.bioCandidates.slice(0, 4).map((b, i) => `  ${i + 1}. ${b}`),
    ``,
    `Social/caption text (${signals.socialTextSignals.length} found):`,
    ...signals.socialTextSignals.slice(0, 5).map((b) => `  - ${b}`),
    ``,
    `Product signals (${signals.productSignals.length} found):`,
    ...signals.productSignals.slice(0, 6).map((p) =>
      `  - "${p.title}" ${p.price ? `@ ${p.price}` : ""}`
    ),
    ``,
    `Collection signals (${signals.collectionSignals.length} found):`,
    ...signals.collectionSignals.slice(0, 5).map((c) => `  - ${c.name}`),
    ``,
    `Event signals (${signals.eventSignals.length} found):`,
    ...signals.eventSignals.slice(0, 4).map((e) => `  - ${e.title}${e.date ? ` (${e.date})` : ""}`),
    ``,
    `Commission signals: ${signals.commissionSignals.length > 0 ? "YES" : "none"}`,
    `Class/workshop signals: ${signals.classWorkshopSignals.length > 0 ? "YES" : "none"}`,
    signals.commissionSignals.length > 0
      ? `  Examples: ${signals.commissionSignals.slice(0, 2).join(" | ")}`
      : "",
    signals.classWorkshopSignals.length > 0
      ? `  Examples: ${signals.classWorkshopSignals.slice(0, 2).join(" | ")}`
      : "",
    ``,
    `External links (${signals.externalLinks.length}): ${signals.externalLinks.slice(0, 5).join(", ")}`,
    ``,
    `Image count: ${signals.imageUrls.length}`,
    ``,
    `=== YOUR TASK ===`,
    ``,
    `Based ONLY on the signals above, produce a JSON object matching this exact schema.`,
    `Do NOT invent information not supported by signals. Use null when uncertain.`,
    ``,
    `{`,
    `  "identity": {`,
    `    "name": "string — best guess at creator's real or studio name",`,
    `    "handle": "string | null — social/shop handle",`,
    `    "locationGuess": "string | null — city, region, or country if inferable",`,
    `    "shortBio": "1–2 sentences suitable for a card preview",`,
    `    "longBio": "3–5 sentences for the studio About section, written in third person"`,
    `  },`,
    `  "styleProfile": {`,
    `    "aesthetic": ["array of 2–5 aesthetic keywords, e.g. handmade, minimalist, bold, organic"],`,
    `    "medium": ["array of 1–5 materials/techniques, e.g. oil paint, ceramics, digital illustration"],`,
    `    "priceRange": "budget | mid | premium | luxury | null",`,
    `    "audienceGuess": ["array of 2–4 audience descriptors, e.g. collectors, parents, beginners"],`,
    `    "tags": ["flat searchable tags, max 10, lowercase, e.g. art, ceramics, handmade, pottery"]`,
    `  },`,
    `  "monetization": {`,
    `    "primaryModel": "products | services | hybrid | community | null",`,
    `    "signals": ["list what you observed that signals monetization"],`,
    `    "opportunities": ["2–4 concrete opportunities the studio could offer, based on signals"]`,
    `  },`,
    `  "collections": [`,
    `    {`,
    `      "name": "collection name",`,
    `      "description": "1–2 sentence description inferred from signals",`,
    `      "estimatedItemCount": number | null,`,
    `      "representativeImageUrl": null`,
    `    }`,
    `  ],`,
    `  "vertical": "artist | maker | tutor | fitness_trainer | instructor | local_expert | service_creator | unknown",`,
    `  "suggestedStudioName": "polished studio name for this creator (may differ from handle)",`,
    `  "suggestedTagline": "punchy 5–10 word tagline",`,
    `  "suggestedCategories": ["2–4 category strings, e.g. Visual Art, Ceramics, Home Goods"],`,
    `  "suggestedHeroImageUrl": null,`,
    `  "confidence": "low | medium | high — based on signal richness",`,
    `  "reviewNotes": ["flag any missing data, low-confidence inferences, or things an admin should verify"]`,
    `}`,
    ``,
    `Respond with ONLY the JSON object. No markdown fences, no explanation.`,
  ];

  return lines.filter((l) => l !== "").join("\n");
}

// ─── Safe JSON parse ───────────────────────────────────────────────────────────

function safeParseJson(text: string): Record<string, unknown> | null {
  // Strip potential markdown fences
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first { ... } block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string");
}
function asNumberOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function parseIdentity(raw: unknown): CreatorIdentity {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name:          asString(r.name, "Unknown Creator"),
    handle:        asStringOrNull(r.handle),
    locationGuess: asStringOrNull(r.locationGuess),
    shortBio:      asString(r.shortBio, ""),
    longBio:       asString(r.longBio, ""),
  };
}

function parseStyleProfile(raw: unknown): StyleProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rangeMap: Record<string, "budget" | "mid" | "premium" | "luxury"> = {
    budget: "budget", mid: "mid", premium: "premium", luxury: "luxury",
  };
  return {
    aesthetic:    asStringArray(r.aesthetic),
    medium:       asStringArray(r.medium),
    priceRange:   rangeMap[asString(r.priceRange)] ?? null,
    audienceGuess: asStringArray(r.audienceGuess),
    tags:         asStringArray(r.tags).slice(0, 12),
  };
}

function parseMonetization(raw: unknown): MonetizationProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const modelMap: Record<string, "products" | "services" | "hybrid" | "community"> = {
    products: "products", services: "services", hybrid: "hybrid", community: "community",
  };
  return {
    primaryModel:  modelMap[asString(r.primaryModel)] ?? null,
    signals:       asStringArray(r.signals),
    opportunities: asStringArray(r.opportunities),
  };
}

function parseCollections(raw: unknown): AssembledCollection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === "object")
    .map((c: Record<string, unknown>) => ({
      name:                 asString(c.name, "Collection"),
      description:          asString(c.description, ""),
      estimatedItemCount:   asNumberOrNull(c.estimatedItemCount),
      representativeImageUrl: asStringOrNull(c.representativeImageUrl),
    }))
    .slice(0, 10);
}

function parseVertical(raw: unknown): CreatorVertical {
  const allowed: CreatorVertical[] = ["artist", "maker", "tutor", "fitness_trainer", "instructor", "local_expert", "service_creator", "unknown"];
  const s = asString(raw);
  return allowed.includes(s as CreatorVertical) ? (s as CreatorVertical) : "unknown";
}

function parseConfidence(raw: unknown): AssemblyConfidence {
  const s = asString(raw);
  if (s === "high" || s === "medium") return s;
  return "low";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function enrichCreator(
  source: CreatorSource,
  signals: CreatorSignalSet,
  pastedContext?: string,
): Promise<AssembledCreatorStudio> {
  const prompt = buildEnrichmentPrompt(source, signals, pastedContext);

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = safeParseJson(raw);

  const now = new Date().toISOString();
  const creatorId = generateCreatorId(source.sourceUrl);

  if (!parsed) {
    // Graceful degradation — return a low-confidence shell with raw notes
    return {
      creatorId,
      createdAt: now,
      updatedAt: now,
      status: "assembled",
      source,
      signals,
      identity: {
        name:          signals.creatorName ?? "Unknown Creator",
        handle:        signals.handle,
        locationGuess: null,
        shortBio:      signals.bioCandidates[0] ?? "",
        longBio:       signals.bioCandidates.slice(0, 3).join(" "),
      },
      styleProfile: { aesthetic: [], medium: [], priceRange: null, audienceGuess: [], tags: [] },
      monetization: { primaryModel: null, signals: [], opportunities: [] },
      collections:  [],
      vertical:     "unknown",
      suggestedStudioName:  signals.creatorName ?? "Creator Studio",
      suggestedTagline:     "",
      suggestedCategories:  [],
      suggestedHeroImageUrl: signals.imageUrls[0] ?? null,
      confidence:    "low",
      reviewNotes:   ["AI enrichment returned unparseable JSON — manual review required.", raw.slice(0, 300)],
      adminNotes:    "",
    };
  }

  return {
    creatorId,
    createdAt: now,
    updatedAt: now,
    status: "assembled",
    source,
    signals,
    identity:             parseIdentity(parsed.identity),
    styleProfile:         parseStyleProfile(parsed.styleProfile),
    monetization:         parseMonetization(parsed.monetization),
    collections:          parseCollections(parsed.collections),
    vertical:             parseVertical(parsed.vertical),
    suggestedStudioName:  asString(parsed.suggestedStudioName, signals.creatorName ?? "Creator Studio"),
    suggestedTagline:     asString(parsed.suggestedTagline, ""),
    suggestedCategories:  asStringArray(parsed.suggestedCategories),
    suggestedHeroImageUrl: signals.imageUrls[0] ?? null,
    confidence:           parseConfidence(parsed.confidence),
    reviewNotes: [
      ...(source.htmlLength === 0 && !pastedContext
        ? [`⚠️ ${source.platform} blocks automated access — assembled from URL/handle only. Signals are minimal; manual enrichment recommended.`]
        : source.htmlLength === 0 && pastedContext
        ? [`ℹ️ ${source.platform} blocks automated access — assembled from admin-pasted profile info.`]
        : []),
      ...asStringArray(parsed.reviewNotes),
    ],
    adminNotes:           "",
  };
}
