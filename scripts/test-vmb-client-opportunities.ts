/**
 * npm run test:vmb:clients
 * Verifies client opportunity mapper returns rows from analysis arrays.
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { analyzeVmbBook } from "../lib/vmb/book-analysis/analyze-book";
import { buildClientOpportunities } from "../lib/vmb/client-opportunities";
import { parseBookUpload } from "../lib/vmb/provider-ingest/parse-book-upload";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function generate100RowCsv(): string {
  const header =
    "clientName,email,phone,serviceName,lastVisitDate,amountSpent,visitCount";
  const rows: string[] = [];
  for (let i = 0; i < 100; i++) {
    const daysAgo = 60 + (i % 120);
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    const visits = 2 + (i % 8);
    const spend = 80 + (i % 40) * 5;
    const service =
      i % 11 === 0
        ? "Bridal Package"
        : i % 13 === 0
          ? "Birthday Blowout"
          : i % 17 === 0
            ? "Gift Card"
            : "Haircut";
    rows.push(
      `Client ${i},client${i}@test.com,555000${String(i).padStart(4, "0")},${service},${date},${spend},${visits}`,
    );
  }
  return [header, ...rows].join("\n");
}

function runFixture(label: string, rawText: string) {
  const parsed = parseBookUpload({ rawText, providerPlatform: "glossgenius" });
  assert(parsed.records.length > 0, `${label}: expected parsed records`);

  const analysis = analyzeVmbBook({
    trialId: "vmb-trial-test",
    salonName: "Test Salon",
    providerPlatform: "glossgenius",
    records: parsed.records,
  });

  const summary = buildClientOpportunities(analysis);
  assert(summary.rows.length > 0, `${label}: expected mapped rows > 0`);
  assert(
    summary.reactivationCount + summary.referralCount + summary.giftCount > 0,
    `${label}: expected opportunity arrays to produce counts`,
  );

  console.log(
    JSON.stringify({
      fixture: label,
      recordCount: summary.clientsAnalyzed,
      rows: summary.rows.length,
      reactivation: summary.reactivationCount,
      referral: summary.referralCount,
      gift: summary.giftCount,
      trustedIntro: summary.trustedIntroCount,
    }),
  );

  return summary.rows.length;
}

const sampleFixture = path.join(
  process.cwd(),
  "runtime-data",
  "vmb",
  "sample-exports",
  "glossgenius-sample.csv",
);

let rowCount100 = runFixture("generated-100-row-book", generate100RowCsv());

if (existsSync(sampleFixture)) {
  const raw = readFileSync(sampleFixture, "utf8");
  runFixture("glossgenius-sample.csv", raw);
}

assert(rowCount100 > 0, "100-row book must map to >0 client opportunity rows");
console.log("OK test:vmb:clients");
