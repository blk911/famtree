// scripts/cleanup-unverified-generated-url-matches.ts
// Removes unverified machine-generated appointment-platform URLs that were saved as
// confirmed prospect evidence in earlier resolver runs.
//
// Root cause: generateCandidateUrls() embeds the IG handle in the URL (e.g.
// styleseat.com/m/{handle}), and scoreCandidate() gave +35 for "exact handle in URL" —
// a circular signal. Those URLs passed the ≥5 threshold without real identity evidence,
// and were saved to allMatchedUrls, platforms, and platformSignals, inflating
// operationalDataScore and relationshipOpportunityType.
//
// Fix: for each prospect whose source was a hashtag_harvest or ig-stub-run, inspect
// allMatchedUrls for appointment-platform URLs where:
//   • the URL matches a known generated pattern (handle embedded in path/subdomain), AND
//   • the matchReason contains NO positive identity evidence (no IG backlink, no display name match)
// Those URLs are removed. Classification and platforms are then recomputed.
// Human-set fields (status, notes, validationStatus, archiveReason, classificationLocked) are
// always preserved.
//
// Usage:
//   npx tsx scripts/cleanup-unverified-generated-url-matches.ts --dry-run
//   npx tsx scripts/cleanup-unverified-generated-url-matches.ts

import path from "path";
import { promises as fs } from "fs";
import { classifyRelationshipOpportunity } from "../lib/studios/prospects/opportunity-classifier";
import type { RelationshipOpportunityClassification } from "../lib/studios/prospects/opportunity-classifier";

// ─── Appointment platform domain patterns ────────────────────────────────────

const APPOINTMENT_PLATFORM_DOMAINS = [
  "styleseat.com",
  "glossgenius.com",
  "vagaro.com",
  "booksy.com",
  "fresha.com",
  "squareup.com",
  "acuityscheduling.com",
  "mindbodyonline.com",
];

/** Returns true when a URL belongs to an appointment booking platform. */
function isAppointmentPlatformUrl(url: string): boolean {
  const u = url.toLowerCase();
  return APPOINTMENT_PLATFORM_DOMAINS.some((d) => u.includes(d));
}

/** Returns true when the handle is embedded in the URL in a way that matches
 *  the pattern produced by generateCandidateUrls(). */
function isHandleEmbeddedInUrl(url: string, handle: string): boolean {
  const h = handle.toLowerCase().replace(/^@/, "").trim();
  if (h.length < 4) return false; // too short to be meaningful

  const variants = [
    h,
    h.replace(/_/g, ""),  // underscoreless
    h.replace(/\./g, ""), // dotless
    h.replace(/-/g, ""),  // dashless
  ];

  const urlLow = url.toLowerCase();
  return variants.some((v) => urlLow.includes(v));
}

/** Returns true when matchReason contains positive identity evidence,
 *  meaning a human (or real signal) confirmed this profile belongs to the creator. */
function hasPositiveIdentityEvidence(matchReason: string): boolean {
  const r = matchReason.toLowerCase();
  return (
    r.includes("ig backlink") ||
    r.includes("backlink confirmed") ||
    r.includes("ig_backlink_confirmed") ||
    r.includes("display name match") ||
    r.includes("display_name_confirmed")
  );
}

/** Returns true when this matched URL is a contaminated generated appointment URL. */
function isContaminatedUrl(url: { url: string; platform: string; matchReason: string }, handle: string): boolean {
  return (
    isAppointmentPlatformUrl(url.url) &&
    isHandleEmbeddedInUrl(url.url, handle) &&
    !hasPositiveIdentityEvidence(url.matchReason)
  );
}

// ─── Prospect types (minimal, matching ProspectRecord) ───────────────────────

interface MatchedUrl { url: string; platform: string; confidence: number; matchReason: string; }
interface ProspectRecord {
  prospectId: string;
  identity: { handle: string; name: string; categoryGuess: string | null; locationGuess: string | null };
  source: { sourceType: string; batchId: string; sourceHandle: string; sourceDisplayName: string };
  sourceTool: string;
  sourceHashtags: string[];
  sourcePath: string;
  bestMatch: { platform: string; url: string; confidence: number; matchReason: string } | null;
  platforms: string[];
  allMatchedUrls: MatchedUrl[];
  evidence: unknown[];
  services: string[];
  educationType: string | null;
  audienceType: string | null;
  sourceTopic: string | null;
  vertical: string;
  businessCategory?: string | null;
  businessSubcategory?: string | null;
  relationshipOpportunityType?: string | null;
  operationalDataScore?: number | null;
  overallOpportunityScore?: number | null;
  offerFitTags?: string[];
  platformSignals?: string[];
  classificationLocked?: boolean;
  // Human-set fields — never touched
  status: string;
  notes: string;
  validationStatus: string;
  archiveReason: string | null;
  [key: string]: unknown;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const DATA_DIR = path.resolve(process.cwd(), "runtime-data", "studios", "prospects");
const PROSPECTS_FILE = path.join(DATA_DIR, "prospects.json");

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log(`\n🔍 Cleanup: unverified generated appointment-platform URLs`);
  console.log(`   Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE — will write changes"}`);
  console.log(`   File: ${PROSPECTS_FILE}\n`);

  let raw: string;
  try {
    raw = await fs.readFile(PROSPECTS_FILE, "utf-8");
  } catch {
    console.error("❌ Could not read prospects.json — is the path correct?");
    process.exit(1);
  }

  const records: ProspectRecord[] = JSON.parse(raw);
  console.log(`   Total prospects: ${records.length}`);

  let scannedCount = 0;
  let contaminatedCount = 0;
  let urlsRemovedCount = 0;
  let bestMatchClearedCount = 0;

  interface StatEntry {
    prospectId: string;
    handle: string;
    removedUrls: string[];
    bestMatchCleared: boolean;
  }
  const changeLog: StatEntry[] = [];

  const updated = records.map((p) => {
    // Only process records from the hashtag harvest / ig-stub resolver paths.
    // StyleSeat harvest and directory imports produce their own confirmed URLs.
    const isHarvestRecord =
      p.source?.sourceType === "hashtag_harvest" ||
      p.source?.sourceType === "ig-stub-run" ||
      p.sourceTool === "hashtag_harvest" ||
      p.sourceTool === "ig-stub-run";

    if (!isHarvestRecord) return p;
    scannedCount++;

    const handle = p.identity.handle;
    const contaminated = p.allMatchedUrls.filter((u) => isContaminatedUrl(u, handle));
    if (contaminated.length === 0) return p;

    contaminatedCount++;
    urlsRemovedCount += contaminated.length;
    const contaminatedUrls = new Set(contaminated.map((u) => u.url));

    const cleanUrls = p.allMatchedUrls.filter((u) => !contaminatedUrls.has(u.url));

    // Check if bestMatch is also contaminated
    const bestMatchWasContaminated =
      p.bestMatch !== null && contaminatedUrls.has(p.bestMatch.url);
    if (bestMatchWasContaminated) bestMatchClearedCount++;

    // Pick new bestMatch from remaining clean URLs (highest confidence)
    const newBestMatch: ProspectRecord["bestMatch"] = cleanUrls.length > 0
      ? cleanUrls.reduce((best, u) => (u.confidence > best.confidence ? u : best), cleanUrls[0])
      : null;

    // Recompute platforms from clean URLs only
    const newPlatforms = Array.from(new Set(cleanUrls.map((u) => u.platform)));

    // Recompute opportunity classification from clean data
    let classification: RelationshipOpportunityClassification | null = null;
    if (!p.classificationLocked) {
      classification = classifyRelationshipOpportunity({
        handle,
        displayName: p.identity.name,
        description: [p.identity.categoryGuess, p.sourceTopic, ...(p.services ?? [])].filter(Boolean).join(" "),
        sourceHashtags: p.sourceHashtags,
        sourcePath: p.sourcePath,
        bestUrl: newBestMatch?.url,
        allMatchedUrls: cleanUrls.map((u) => u.url),
        platforms: newPlatforms,
        evidence: p.evidence,
        vertical: p.vertical,
        category: p.identity.categoryGuess ?? undefined,
        educationType: p.educationType,
        audienceType: p.audienceType,
      });
    }

    changeLog.push({
      prospectId: p.prospectId,
      handle,
      removedUrls: contaminated.map((u) => u.url),
      bestMatchCleared: bestMatchWasContaminated,
    });

    return {
      ...p,
      allMatchedUrls: cleanUrls,
      platforms: newPlatforms,
      bestMatch: bestMatchWasContaminated ? (newBestMatch ?? null) : p.bestMatch,
      ...(classification ?? {}),
      // Human-set fields — always preserved (re-assert after spread)
      status: p.status,
      notes: p.notes,
      validationStatus: p.validationStatus,
      archiveReason: p.archiveReason,
      classificationLocked: p.classificationLocked,
    };
  });

  // ─── Report ──────────────────────────────────────────────────────────────

  console.log(`\n📊 Scan results:`);
  console.log(`   Scanned (harvest/ig-stub records): ${scannedCount}`);
  console.log(`   Prospects with contaminated URLs:  ${contaminatedCount}`);
  console.log(`   Total URLs removed:                ${urlsRemovedCount}`);
  console.log(`   bestMatch records cleared:         ${bestMatchClearedCount}`);

  if (changeLog.length > 0) {
    console.log(`\n📋 Changes:`);
    for (const entry of changeLog) {
      console.log(`   @${entry.handle} (${entry.prospectId})`);
      for (const url of entry.removedUrls) {
        console.log(`     - removed: ${url}`);
      }
      if (entry.bestMatchCleared) {
        console.log(`     - bestMatch cleared (was a contaminated URL)`);
      }
    }
  } else {
    console.log(`\n✅ No contaminated URLs found — prospects.json is clean.`);
  }

  if (!dryRun && contaminatedCount > 0) {
    await fs.writeFile(PROSPECTS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    console.log(`\n✅ Wrote ${records.length} prospects back to disk (${urlsRemovedCount} URLs removed).`);
  } else if (dryRun && contaminatedCount > 0) {
    console.log(`\n⏸️  Dry run — no changes written. Re-run without --dry-run to apply.`);
  }

  console.log();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
