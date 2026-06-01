/**
 * Slug normalization checks for GlossGenius handle resolver.
 * Run: npx tsx scripts/validate-glossgenius-slugs.ts
 */
import { generateGlossGeniusSlugCandidates } from "../lib/intelligence/salon/glossgenius-handle-resolver";

function assertContains(slugs: string[], expected: string, label: string) {
  if (!slugs.includes(expected)) {
    console.error(`FAIL ${label}: expected slug "${expected}", got [${slugs.join(", ")}]`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK ${label} → ${expected}`);
}

const blended = generateGlossGeniusSlugCandidates("blended_by_brandi");
assertContains(blended, "blendedbybrandi", "blended_by_brandi");

const nails = generateGlossGeniusSlugCandidates("nails.by.jess");
assertContains(nails, "nailsbyjess", "nails.by.jess");

const atHandle = generateGlossGeniusSlugCandidates("@blendedbybrandi");
assertContains(atHandle, "blendedbybrandi", "@blendedbybrandi");

if (process.exitCode !== 1) {
  console.log("\nSlug validation passed.");
}
