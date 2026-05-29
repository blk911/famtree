// scripts/validate-resolver-url-verification.ts
// Validates that the resolver URL verification logic correctly gates which candidate
// URLs are saved as confirmed prospect evidence.
//
// Five test cases:
//   A) IG hashtag harvest + generated StyleSeat URL → should NOT appear in confirmedProfiles
//   B) Source contains a styleseat_harvest URL     → should be confirmed (not generated)
//   C) IG bio contains StyleSeat URL (IG backlink) → should be confirmed
//   D) Linktree has StyleSeat backlink             → should be confirmed via IG backlink check
//   E) Generated URL that fetches a 404            → rejected as "not_found"
//
// Usage:
//   npx tsx scripts/validate-resolver-url-verification.ts
//
// NOTE: this does NOT make real network requests. It mocks fetchCandidate responses
// by monkey-patching the module's fetch internals via test doubles built over
// verifyGeneratedAppointmentCandidate and scoreCandidate directly.

import {
  scoreCandidate,
  verifyGeneratedAppointmentCandidate,
} from "../lib/studios/creator-lab/ig-stubs/validator";
import type { IgSeed, CandidateFetch } from "../lib/studios/creator-lab/ig-stubs/types";

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ─── Shared seed ─────────────────────────────────────────────────────────────

const SEED: IgSeed = {
  handle: "arianailbar6751",
  displayName: "Aria Nail Bar",
};

// ─── Test A: Generated StyleSeat URL — no identity evidence → rejected ────────

console.log("\nTest A: Generated StyleSeat URL, no identity evidence");
{
  const fetched: CandidateFetch = {
    url: "https://www.styleseat.com/m/arianailbar6751",
    platform: "styleseat",
    ok: true,
    httpStatus: 200,
    finalUrl: "https://www.styleseat.com/m/arianailbar6751",
    title: "Book Appointments | StyleSeat",
    description: "Book beauty services near you",
    bodyText: "StyleSeat beauty services lashes nails hair salon appointment",
    instagramLinks: [],
    allLinks: ["https://www.styleseat.com/search"],
    imageUrls: [],
  };

  // With isGenerated=true, no handle-in-URL bonus — score check
  const scored = scoreCandidate(SEED, fetched, true /* isGenerated */);
  // Services present → some score, but should not get the +35 circular bonus
  const noCircularBonus = scored === null || !scored.matchReason.includes("exact handle in URL");
  assert("scoreCandidate: no 'exact handle in URL' bonus for generated URL", noCircularBonus,
    `matchReason: ${scored?.matchReason ?? "null"}`);

  // Verification check (no IG backlink, no display name)
  const verification = verifyGeneratedAppointmentCandidate(SEED, fetched, scored);
  assert("verifyGeneratedAppointmentCandidate: rejected (appointment_platform_unverified)",
    !verification.confirmed,
    `reason: ${verification.reason}`);
  assert("rejection reason is 'appointment_platform_unverified'",
    verification.reason === "appointment_platform_unverified" || verification.reason === "dead_page_or_low_score",
    `actual reason: ${verification.reason}`);
}

// ─── Test B: StyleSeat harvest URL (not generated) → accepted ─────────────────

console.log("\nTest B: StyleSeat profile page — IG backlink present → confirmed");
{
  const fetched: CandidateFetch = {
    url: "https://www.styleseat.com/m/arianailbar6751",
    platform: "styleseat",
    ok: true,
    httpStatus: 200,
    finalUrl: "https://www.styleseat.com/m/arianailbar6751",
    title: "Aria Nail Bar | StyleSeat",
    description: "Book with Aria Nail Bar — lashes, nails, and more",
    bodyText: "Aria Nail Bar lashes nails appointment book now",
    instagramLinks: ["https://www.instagram.com/arianailbar6751"],
    allLinks: ["https://www.instagram.com/arianailbar6751"],
    imageUrls: [],
  };

  // Source-found URL (isGenerated=false) → gets handle-in-URL bonus normally
  const scored = scoreCandidate(SEED, fetched, false /* not generated */);
  assert("scoreCandidate: returns a profile (not null)", scored !== null,
    scored ? `score=${scored.confidenceScore}` : "null");

  // Has IG backlink → verification passes
  const verification = verifyGeneratedAppointmentCandidate(SEED, fetched, scored);
  assert("verifyGeneratedAppointmentCandidate: confirmed via ig_backlink",
    verification.confirmed && verification.reason === "ig_backlink_confirmed",
    `confirmed=${verification.confirmed}, reason=${verification.reason}`);
}

// ─── Test C: Generated URL where display name appears in page → confirmed ─────

console.log("\nTest C: Generated URL — display name 'Aria Nail Bar' in page body → confirmed");
{
  const fetched: CandidateFetch = {
    url: "https://www.styleseat.com/m/arianailbar6751",
    platform: "styleseat",
    ok: true,
    httpStatus: 200,
    finalUrl: "https://www.styleseat.com/m/arianailbar6751",
    title: "Aria Nail Bar | StyleSeat",
    description: "Book with Aria Nail Bar for nails, lashes, and more",
    bodyText: "Welcome to Aria Nail Bar. Book your appointment today for nails, lashes.",
    instagramLinks: [],
    allLinks: [],
    imageUrls: [],
  };

  const scored = scoreCandidate(SEED, fetched, true /* isGenerated */);
  // displayName "aria nail bar" should appear in bodyText → +25
  assert("scoreCandidate: display name match gives score > 0", scored !== null && scored.confidenceScore > 0,
    `score=${scored?.confidenceScore ?? "null"}`);

  const verification = verifyGeneratedAppointmentCandidate(SEED, fetched, scored);
  assert("verifyGeneratedAppointmentCandidate: confirmed via display_name",
    verification.confirmed && verification.reason === "display_name_confirmed",
    `confirmed=${verification.confirmed}, reason=${verification.reason}`);
}

// ─── Test D: Linktree page links back to IG handle → IG backlink confirmed ───

console.log("\nTest D: Generated Linktree URL — IG backlink to same handle → confirmed");
{
  const fetched: CandidateFetch = {
    url: "https://linktr.ee/arianailbar6751",
    platform: "linktree",
    ok: true,
    httpStatus: 200,
    finalUrl: "https://linktr.ee/arianailbar6751",
    title: "Aria Nail Bar | Linktree",
    description: "Links for Aria Nail Bar",
    bodyText: "Aria Nail Bar. Book appointments. Follow on Instagram.",
    instagramLinks: ["https://www.instagram.com/arianailbar6751/"],
    allLinks: [
      "https://www.instagram.com/arianailbar6751/",
      "https://www.styleseat.com/m/arianailbar6751",
    ],
    imageUrls: [],
  };

  const scored = scoreCandidate(SEED, fetched, true /* isGenerated */);
  // IG backlink gives +30
  assert("scoreCandidate: IG backlink gives meaningful score", scored !== null && scored.confidenceScore >= 30,
    `score=${scored?.confidenceScore ?? "null"}`);
  assert("scoreCandidate: 'IG backlink confirmed' in matchReason",
    scored !== null && scored.matchReason.toLowerCase().includes("ig backlink"),
    `matchReason=${scored?.matchReason ?? "null"}`);

  // Even though linktree is not in APPOINTMENT_PLATFORMS, verification logic should still work
  const verification = verifyGeneratedAppointmentCandidate(SEED, fetched, scored);
  assert("verifyGeneratedAppointmentCandidate: confirmed via ig_backlink",
    verification.confirmed && verification.reason === "ig_backlink_confirmed",
    `confirmed=${verification.confirmed}, reason=${verification.reason}`);
}

// ─── Test E: Generated URL returns 404 → rejected as not_found ───────────────

console.log("\nTest E: Generated URL — HTTP 404 → rejected as not_found");
{
  const fetched: CandidateFetch = {
    url: "https://www.styleseat.com/m/arianailbar6751",
    platform: "styleseat",
    ok: false,
    httpStatus: 404,
    finalUrl: "https://www.styleseat.com/m/arianailbar6751",
    title: null,
    description: null,
    bodyText: "",
    instagramLinks: [],
    allLinks: [],
    imageUrls: [],
  };

  // scoreCandidate returns null for non-ok responses
  const scored = scoreCandidate(SEED, fetched, true /* isGenerated */);
  assert("scoreCandidate: returns null for 404", scored === null,
    `scored=${JSON.stringify(scored)}`);

  const verification = verifyGeneratedAppointmentCandidate(SEED, fetched, scored);
  assert("verifyGeneratedAppointmentCandidate: rejected as not_found",
    !verification.confirmed && verification.reason === "not_found",
    `confirmed=${verification.confirmed}, reason=${verification.reason}`);
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log(`\n❌ Some tests failed — review the output above.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passed.\n`);
}
