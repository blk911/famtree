/**
 * npm run test:vmb:parse
 * Verifies GlossGenius sample CSV → parse → analysis pipeline.
 */
import { readFileSync } from "fs";
import path from "path";
import { analyzeVmbBook } from "../lib/vmb/book-analysis/analyze-book";
import { parseBookUpload } from "../lib/vmb/provider-ingest/parse-book-upload";

const FIXTURE = path.join(
  process.cwd(),
  "runtime-data",
  "vmb",
  "sample-exports",
  "glossgenius-sample.csv",
);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const raw = readFileSync(FIXTURE, "utf8");
const parsed = parseBookUpload({ rawText: raw, providerPlatform: "glossgenius" });

assert(parsed.parsedRecordCount === 20, `expected 20 records, got ${parsed.parsedRecordCount}`);
assert(parsed.records.length === 20, `records array length ${parsed.records.length}`);
assert(parsed.detectedColumns.length >= 5, "expected detected CSV columns");
assert(
  parsed.detectedColumns.some((c) => c.toLowerCase().includes("client")),
  "expected Client Name column",
);

const analysis = analyzeVmbBook({
  salonName: "Beauty Tribe Salon",
  providerPlatform: "glossgenius",
  records: parsed.records,
});

assert(analysis.reactivationTargets.length > 0, "expected reactivation opportunities");
assert(analysis.referralOpportunities.length > 0, "expected referral opportunities");
assert(analysis.giftOpportunities.length > 0, "expected gift opportunities");
assert(
  analysis.trustedProviderIntroOpportunities.length > 0,
  "expected trusted intro opportunities",
);
assert(analysis.estimatedRecoverableRevenue > 0, "expected positive revenue estimate");

console.log("OK test:vmb:parse");
console.log(
  JSON.stringify(
    {
      parsedRecordCount: parsed.parsedRecordCount,
      skippedRows: parsed.skippedRows,
      detectedColumns: parsed.detectedColumns,
      warnings: parsed.warnings.slice(0, 3),
      analysis: {
        recordCount: analysis.recordCount,
        reactivation: analysis.reactivationTargets.length,
        referral: analysis.referralOpportunities.length,
        gift: analysis.giftOpportunities.length,
        trustedIntro: analysis.trustedProviderIntroOpportunities.length,
        estimatedRecoverableRevenue: analysis.estimatedRecoverableRevenue,
      },
    },
    null,
    2,
  ),
);
