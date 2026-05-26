// lib/studios/identity-seeds/assembler.ts
// Reusable Identity Seed Assembler — shared resolution + upsert pipeline.
//
// Architecture:
//   Phase 1 — IG enrichment in PARALLEL (network-bound)
//   Phase 2 — Prospect upserts SEQUENTIALLY (file I/O, no concurrent writes)
//
// Used by: StyleSeat resolver, Education Seed import, any future source adapter.

import { upsertProspect } from "@/lib/studios/prospects/store";
import { buildProspectSourcePath } from "@/lib/studios/prospects/source-path";
import { generateIdentityCandidates } from "./normalize";
import type {
  IdentitySeed,
  IdentityAssemblerOptions,
  IdentityAssemblerResult,
  IdentityAssemblerRunResult,
  AssemblerStatus,
} from "./types";
import type { UpsertInput } from "@/lib/studios/prospects/store";
import type { ResolvedProfile } from "@/lib/studios/creator-lab/ig-stubs/types";
import type { MatchedUrl, ProspectSource } from "@/lib/studios/prospects/types";

// ─── IG resolution helpers ────────────────────────────────────────────────────

type ResolveMode = import("@/lib/studios/creator-lab/ig-stubs/types").ResolveMode;
type IgSeed      = import("@/lib/studios/creator-lab/ig-stubs/types").IgSeed;

async function resolveIgHandle(
  handle: string,
  displayName: string,
  mode: ResolveMode,
): Promise<ResolvedProfile[]> {
  const igSeed: IgSeed = { handle, displayName };

  const { generateCandidateUrls } = await import("@/lib/studios/creator-lab/ig-stubs/url-patterns");
  const candidateUrls = generateCandidateUrls(handle);

  if (mode === "deep") {
    try {
      const { deepResolve } = await import("@/lib/studios/creator-lab/ig-stubs/deep-research");
      return await deepResolve(igSeed, candidateUrls);
    } catch {
      // deep-research unavailable — fall through to fast
    }
  }

  const { fastResolve } = await import("@/lib/studios/creator-lab/ig-stubs/validator");
  return await fastResolve(igSeed, candidateUrls);
}

// ─── Per-seed IG enrichment ───────────────────────────────────────────────────

interface IgMatch {
  handle: string;
  profiles: ResolvedProfile[];
  confidence: number;
  candidatesTried: number;
}

async function findBestIgMatch(
  seed: IdentitySeed,
  options: IdentityAssemblerOptions,
): Promise<IgMatch | null> {
  const maxCandidates = options.maxCandidatesPerSeed ?? 8;
  const threshold     = options.igConfidenceThreshold ?? 20;
  const candidates    = generateIdentityCandidates(seed, maxCandidates);

  if (candidates.length === 0) return null;

  let best: IgMatch | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const handle = candidates[i];

    let profiles: ResolvedProfile[] = [];
    try {
      profiles = await resolveIgHandle(handle, seed.name, options.mode);
    } catch {
      continue;
    }

    const valid    = profiles.filter((p) => p.confidenceScore >= 8);
    const topScore = valid[0]?.confidenceScore ?? 0;

    // Apply seed-context boost (name match, city match)
    const boosted = boostScore(topScore, valid, seed);

    if (boosted > (best?.confidence ?? 0)) {
      best = { handle, profiles: valid, confidence: boosted, candidatesTried: i + 1 };
    }

    // Early stop — good enough match
    if (boosted >= 55) {
      console.log(`[identity-assembler] ✓ early stop @${handle} for "${seed.name}" (conf=${boosted})`);
      break;
    }
  }

  if (!best || best.confidence < threshold) return null;

  return best;
}

function boostScore(
  base: number,
  profiles: ResolvedProfile[],
  seed: IdentitySeed,
): number {
  if (base === 0) return 0;

  let boost = 0;
  const nameLower = seed.name.toLowerCase();
  const firstName = nameLower.split(" ")[0] ?? "";
  const cityLower = (seed.city ?? "").toLowerCase();

  for (const p of profiles) {
    if (p.detectedName && p.detectedName.toLowerCase().includes(firstName)) boost += 8;
    if (cityLower && p.detectedLocation && p.detectedLocation.toLowerCase().includes(cityLower)) boost += 10;
    // Known-URL backlink confirmation
    for (const knownUrl of seed.knownUrls ?? []) {
      if (p.detectedSocialLinks.some((l) => l.includes(new URL(knownUrl.url).hostname))) {
        boost += 12;
      }
    }
    // High-evidence operator (multiple services = likely active real business)
    if (p.detectedServices.length >= 3) boost += 5;
  }

  return Math.min(100, base + boost);
}

// ─── Seed → UpsertInput ───────────────────────────────────────────────────────

export function identitySeedToProspectInput(
  seed: IdentitySeed,
  igHandle: string | null,
  profiles: ResolvedProfile[],
  options: IdentityAssemblerOptions,
): UpsertInput {
  const handle = igHandle
    ?? seed.handle?.replace(/^@/, "")
    ?? seed.name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const overrides = options.sourcePathOverrides ?? {};
  const sourcePath = buildProspectSourcePath({
    vertical:   overrides.verticalLabel ?? seed.vertical,
    platform:   overrides.platformLabel ?? seed.sourcePlatform,
    sourceTool: overrides.toolLabel     ?? seed.sourceTool,
    date:       seed.seedDate,
    hashtag:    seed.sourceHashtag ?? null,
  });

  // Pre-known anchor URLs (e.g. StyleSeat listing)
  const knownUrls: MatchedUrl[] = seed.knownUrls ?? [];

  // Booking-platform profiles from IG resolver
  const resolverUrls: MatchedUrl[] = profiles.map((p) => ({
    platform:    p.platform,
    url:         p.url,
    confidence:  p.confidenceScore,
    matchReason: p.matchReason,
  }));

  const allMatchedUrls = [...knownUrls, ...resolverUrls]
    .sort((a, b) => b.confidence - a.confidence);

  const bestProfile  = profiles[0] ?? null;
  const bestKnownUrl = [...knownUrls].sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  const bestMatch = bestProfile
    ? { platform: bestProfile.platform, url: bestProfile.url, confidence: bestProfile.confidenceScore, matchReason: bestProfile.matchReason }
    : bestKnownUrl
    ? { platform: bestKnownUrl.platform, url: bestKnownUrl.url, confidence: bestKnownUrl.confidence, matchReason: bestKnownUrl.matchReason }
    : null;

  const services = Array.from(new Set([
    ...(seed.services ?? []),
    ...profiles.flatMap((p) => p.detectedServices),
  ])).slice(0, 20);

  const locationGuess = [seed.city, seed.state].filter(Boolean).join(", ") || null;

  const evidence: string[] = [
    ...(seed.extraEvidence ?? []),
    ...knownUrls.map((u) => `${u.platform}: ${u.url}`),
    ...profiles.flatMap((p) => p.evidenceSnippets).slice(0, 6),
    ...(seed.bio ? [`Bio: ${seed.bio.slice(0, 120)}`] : []),
  ].filter(Boolean).slice(0, 15);

  const overallConf = bestMatch ? Math.min(100, Math.round(bestMatch.confidence)) : 0;

  const platforms = Array.from(new Set([
    ...(knownUrls.length > 0 ? [seed.sourcePlatform] : []),
    ...(igHandle ? ["instagram"] : []),
    ...profiles.map((p) => p.platform),
  ]));

  // Validate sourceType
  const validSourceTypes = ["ig-stub-run", "hashtag_harvest", "styleseat_harvest", "education_seed_import", "education_directory_import"] as const;
  const sourceType = (validSourceTypes as readonly string[]).includes(seed.sourceTool)
    ? seed.sourceTool as ProspectSource["sourceType"]
    : "education_seed_import" as ProspectSource["sourceType"];

  return {
    source: {
      sourceType,
      batchId:           seed.batchId,
      sourceHandle:      handle,
      sourceDisplayName: seed.name,
    },
    vertical:       seed.vertical,
    sourcePlatform: seed.sourcePlatform,
    sourceTool:     seed.sourceTool,
    sourceHashtag:  seed.sourceHashtag ?? null,
    sourceHashtags: seed.sourceHashtags ?? [],
    sourcePath,
    runId:          seed.runId,
    harvestDate:    seed.seedDate,
    identity: {
      name:          seed.name,
      handle,
      categoryGuess: seed.category ?? null,
      locationGuess,
    },
    educationType: seed.educationType ?? null,
    audienceType:  seed.audienceType  ?? null,
    sourceTopic:   seed.sourceTopic   ?? null,
    platforms,
    bestMatch,
    services,
    allMatchedUrls,
    evidence,
    confidence: {
      identityMatch: igHandle ? 60 : 0,
      bookingMatch:  bestProfile ? bestProfile.confidenceScore : 0,
      categoryMatch: services.length > 0 ? Math.min(100, services.length * 12) : 30,
      locationMatch: locationGuess ? 60 : 0,
      overall:       overallConf,
    },
    suggestedValidationStatus: "needs_review",
  };
}

// ─── Phase 1 intermediate shape ───────────────────────────────────────────────

interface EnrichedSeed {
  seed: IdentitySeed;
  igHandle: string | null;
  candidatesTried: number;
  igConfidence: number;
  profiles: ResolvedProfile[];
  upsertInput: UpsertInput;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

/**
 * Runs the full identity seed assembly pipeline.
 *
 * Phase 1: IG enrichment in PARALLEL (network-bound)
 * Phase 2: prospect upserts SEQUENTIALLY (file I/O — prevents concurrent write EPERM)
 */
export async function runIdentityAssembler(
  seeds: IdentitySeed[],
  options: IdentityAssemblerOptions,
): Promise<IdentityAssemblerRunResult> {
  const maxSeeds  = options.maxSeeds ?? 40;
  const threshold = options.igConfidenceThreshold ?? 20;
  const capped    = seeds.slice(0, maxSeeds);

  console.log(
    `[identity-assembler] Phase 1: enriching ${capped.length} seeds ` +
    `(mode=${options.mode}, dryRun=${options.dryRun ?? false})`
  );

  // ── Phase 1: Parallel IG enrichment ─────────────────────────────────────────
  const settled = await Promise.allSettled(
    capped.map(async (seed): Promise<EnrichedSeed> => {
      const match = await findBestIgMatch(seed, options);

      const igHandle        = match?.handle ?? null;
      const candidatesTried = match?.candidatesTried ?? 0;
      const igConfidence    = match?.confidence ?? 0;
      const profiles        = match?.profiles ?? [];

      const upsertInput = identitySeedToProspectInput(seed, igHandle, profiles, options);

      return { seed, igHandle, candidatesTried, igConfidence, profiles, upsertInput };
    })
  );

  // ── Phase 2: Sequential upserts ─────────────────────────────────────────────
  const results: IdentityAssemblerResult[] = [];
  const saveErrors: Array<{ handle: string; message: string }> = [];
  const savedHandles: string[] = [];
  let savedCount        = 0;
  let failedToSaveCount = 0;
  let totalIgFound      = 0;

  const upsertAttempts = settled.filter((s) => s.status === "fulfilled").length;
  const rejectedCount  = settled.filter((s) => s.status === "rejected").length;
  console.log(
    `[identity-assembler] Phase 2: ${upsertAttempts} upserts ` +
    `(${rejectedCount} phase-1 failures)`
  );

  for (let i = 0; i < settled.length; i++) {
    const s        = settled[i];
    const original = capped[i];

    if (s.status === "rejected") {
      const msg = s.reason instanceof Error ? s.reason.message : "enrichment error";
      results.push({
        seed: original,
        igHandleFound: null,
        igCandidatesTried: 0,
        igConfidence: 0,
        resolved: false,
        prospectId: null,
        saved: false,
        saveError: msg,
        status: "unresolved",
      });
      failedToSaveCount++;
      saveErrors.push({ handle: original.name, message: msg });
      continue;
    }

    const { seed, igHandle, candidatesTried, igConfidence, upsertInput } = s.value;

    if (igHandle && igConfidence >= threshold) totalIgFound++;

    const status: AssemblerStatus =
      igHandle && igConfidence >= 55  ? "ig_verified"  :
      igHandle && igConfidence >= threshold ? "ig_candidate" :
      "unresolved";

    let prospectId: string | null = null;
    let saveError:  string | null = null;
    let saved = false;

    const displayName = seed.name || igHandle || `seed-${i}`;
    console.log(
      `[identity-assembler] [${i + 1}/${upsertAttempts}] upserting "${displayName}" ` +
      `(handle=${igHandle ?? "none"}, conf=${igConfidence})`
    );

    if (options.dryRun) {
      // Dry run: simulate save without writing
      prospectId = `dry-run-${i}`;
      saved = true;
      savedCount++;
      savedHandles.push(igHandle ?? seed.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
      console.log(`[identity-assembler] [dry-run] would save "${displayName}"`);
    } else {
      try {
        const record = await upsertProspect(upsertInput);
        prospectId = record.prospectId;
        savedCount++;
        saved = true;
        savedHandles.push(igHandle ?? seed.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
        console.log(`[identity-assembler] ✓ saved "${displayName}" → ${record.prospectId}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        saveError = msg;
        failedToSaveCount++;
        saveErrors.push({ handle: igHandle ?? displayName, message: msg });
        console.error(`[identity-assembler] ✗ upsert failed for "${displayName}":`, e);
      }
    }

    results.push({
      seed,
      igHandleFound: igHandle,
      igCandidatesTried: candidatesTried,
      igConfidence,
      resolved: igHandle !== null && igConfidence >= threshold,
      prospectId,
      saved,
      saveError,
      status,
    });
  }

  console.log(
    `[identity-assembler] Phase 2 complete: ` +
    `${savedCount} saved, ${failedToSaveCount} failed, ${totalIgFound} IG matches`
  );

  return {
    results,
    savedCount,
    failedToSaveCount,
    saveErrors,
    totalIgFound,
    savedHandles,
    totalAttempted: capped.length,
  };
}
