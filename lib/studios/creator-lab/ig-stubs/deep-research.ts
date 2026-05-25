// lib/studios/creator-lab/ig-stubs/deep-research.ts
// Deep Research Mode: AI-powered identity analysis on top of heuristic scoring.
// Fetches all candidate URLs, runs AI on the top matches, then merges scores.

import OpenAI from "openai";
import type { IgSeed, ResolvedProfile } from "./types";
import type { CandidateUrl } from "./url-patterns";
import { fetchCandidate, scoreCandidate } from "./validator";

// Lazy singleton — avoids build-time instantiation
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Max candidates to send to AI per seed (controls cost)
const AI_ANALYSIS_LIMIT = 4;

// ─── AI analysis of a single candidate page ───────────────────────────────────

interface AiAnalysis {
  isMatch: boolean | "uncertain";
  confidence: number;       // 0–100
  detectedName: string | null;
  detectedLocation: string | null;
  detectedServices: string[];
  detectedPrices: string[];
  reasoning: string;
  evidence: string[];
}

async function analyzePageWithAI(
  seed: IgSeed,
  fetched: {
    url: string;
    platform: string;
    title: string | null;
    description: string | null;
    bodyText: string;
    instagramLinks: string[];
  },
  heuristicScore: number,
): Promise<AiAnalysis> {
  const prompt = [
    `You are analyzing a public web page to determine if it belongs to a specific Instagram creator.`,
    `Only use publicly visible information from the page data provided.`,
    ``,
    `TARGET CREATOR:`,
    `  Instagram handle: @${seed.handle}`,
    `  Display name: ${seed.displayName}`,
    ``,
    `PAGE BEING ANALYZED:`,
    `  URL: ${fetched.url}`,
    `  Platform: ${fetched.platform}`,
    `  Title: ${fetched.title ?? "(none)"}`,
    `  Meta description: ${fetched.description ?? "(none)"}`,
    `  Instagram links found on page: ${fetched.instagramLinks.join(", ") || "(none)"}`,
    `  Body text (first 2500 chars):`,
    fetched.bodyText.slice(0, 2500),
    ``,
    `CONFIDENCE GUIDE:`,
    `  +35 exact handle match in URL or prominent text`,
    `  +25 display name found in page`,
    `  +30 Instagram backlink pointing to same handle`,
    `  +15 matching service category (salon/lashes/nails/etc.)`,
    `  +15 city/location present`,
    `  +5  weak text signal only`,
    `  -40 conflicting identity (different name, different business type)`,
    ``,
    `Respond ONLY with valid JSON — no markdown fences, no explanation:`,
    `{`,
    `  "isMatch": true | false | "uncertain",`,
    `  "confidence": <0-100 integer>,`,
    `  "detectedName": "<business or creator name from page, or null>",`,
    `  "detectedLocation": "<city/state if found, or null>",`,
    `  "detectedServices": ["list of services found"],`,
    `  "detectedPrices": ["$XX price strings found on page"],`,
    `  "reasoning": "<1-2 sentence explanation>",`,
    `  "evidence": ["up to 3 specific text snippets supporting your conclusion"]`,
    `}`,
  ].join("\n");

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 700,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<AiAnalysis>;
    return {
      isMatch: parsed.isMatch ?? "uncertain",
      confidence: typeof parsed.confidence === "number" ? Math.min(100, Math.max(0, parsed.confidence)) : heuristicScore,
      detectedName: typeof parsed.detectedName === "string" ? parsed.detectedName : null,
      detectedLocation: typeof parsed.detectedLocation === "string" ? parsed.detectedLocation : null,
      detectedServices: Array.isArray(parsed.detectedServices) ? parsed.detectedServices.filter((s) => typeof s === "string") : [],
      detectedPrices: Array.isArray(parsed.detectedPrices) ? parsed.detectedPrices.filter((s) => typeof s === "string") : [],
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.filter((s) => typeof s === "string") : [],
    };
  } catch {
    return {
      isMatch: "uncertain",
      confidence: heuristicScore,
      detectedName: null,
      detectedLocation: null,
      detectedServices: [],
      detectedPrices: [],
      reasoning: "AI parse failed — using heuristic score only.",
      evidence: [],
    };
  }
}

// ─── DuckDuckGo search for additional URL discovery ───────────────────────────

async function searchDDG(query: string): Promise<string[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(7_000),
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();
    // DDG encodes result URLs in uddg= params
    const matches = Array.from(html.matchAll(/uddg=([^"&\s]+)/g)).map((m) =>
      decodeURIComponent(m[1])
    );
    return matches.filter((u) => u.startsWith("http")).slice(0, 6);
  } catch {
    return [];
  }
}

// ─── Main deep resolve ────────────────────────────────────────────────────────

export async function deepResolve(
  seed: IgSeed,
  candidates: CandidateUrl[],
): Promise<ResolvedProfile[]> {
  // Step 1: Fetch all candidates in parallel
  const fetchResults = await Promise.allSettled(candidates.map((c) => fetchCandidate(c)));

  // Step 2: Heuristic score all successful fetches
  const heuristicPairs: Array<{ fetched: Awaited<ReturnType<typeof fetchCandidate>>; profile: ResolvedProfile }> = [];
  for (const result of fetchResults) {
    if (result.status !== "fulfilled") continue;
    const fetched = result.value;
    const profile = scoreCandidate(seed, fetched);
    if (profile) heuristicPairs.push({ fetched, profile });
  }

  // Step 3: DDG search for the top two queries — discover extra URLs
  const { generateSearchQueries } = await import("./url-patterns");
  const queries = generateSearchQueries(seed.handle, seed.displayName).slice(0, 3);
  const searchUrls = (await Promise.allSettled(queries.map(searchDDG)))
    .filter((r): r is PromiseFulfilledResult<string[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  // Step 4: Fetch any new URLs found via search (deduplicate against already-fetched)
  const alreadyFetched = new Set(candidates.map((c) => c.url));
  const knownPlatforms = ["glossgenius", "vagaro", "styleseat", "booksy", "linktr", "beacons", "stan.store", "square.site"];
  const newCandidates: CandidateUrl[] = Array.from(new Set(searchUrls))
    .filter((u) => !alreadyFetched.has(u))
    .filter((u) => knownPlatforms.some((p) => u.includes(p)))
    .slice(0, 5)
    .map((u) => ({
      platform: knownPlatforms.find((p) => u.includes(p)) ?? "web",
      url: u,
    }));

  if (newCandidates.length > 0) {
    const newFetches = await Promise.allSettled(newCandidates.map((c) => fetchCandidate(c)));
    for (const result of newFetches) {
      if (result.status !== "fulfilled") continue;
      const fetched = result.value;
      const profile = scoreCandidate(seed, fetched);
      if (profile) heuristicPairs.push({ fetched, profile });
    }
  }

  // Step 5: Sort by heuristic score, pick top N for AI analysis
  heuristicPairs.sort((a, b) => b.profile.confidenceScore - a.profile.confidenceScore);
  const toAnalyze = heuristicPairs.slice(0, AI_ANALYSIS_LIMIT);
  const remainder = heuristicPairs.slice(AI_ANALYSIS_LIMIT);

  // Step 6: AI analysis on top candidates
  const aiAnalyzed = await Promise.allSettled(
    toAnalyze.map(async ({ fetched, profile }) => {
      const ai = await analyzePageWithAI(seed, fetched, profile.confidenceScore);

      // Merge: weight AI slightly higher since it has more context
      const mergedScore = Math.round(profile.confidenceScore * 0.4 + ai.confidence * 0.6);

      const merged: ResolvedProfile = {
        ...profile,
        confidenceScore: Math.min(100, Math.max(0, mergedScore)),
        detectedName: ai.detectedName ?? profile.detectedName,
        detectedLocation: ai.detectedLocation ?? profile.detectedLocation,
        detectedServices:
          ai.detectedServices.length > 0 ? ai.detectedServices : profile.detectedServices,
        detectedPrices:
          ai.detectedPrices.length > 0 ? ai.detectedPrices : profile.detectedPrices,
        matchReason: [profile.matchReason, ai.reasoning].filter(Boolean).join(" · AI: "),
        evidenceSnippets: [...(ai.evidence ?? []), ...profile.evidenceSnippets].slice(0, 6),
      };
      return merged;
    })
  );

  const deepProfiles = aiAnalyzed
    .filter((r): r is PromiseFulfilledResult<ResolvedProfile> => r.status === "fulfilled")
    .map((r) => r.value);

  // Step 7: Combine AI-analyzed + remainder, re-sort
  const allProfiles = [...deepProfiles, ...remainder.map((p) => p.profile)];
  return allProfiles.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
