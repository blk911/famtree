#!/usr/bin/env tsx
// scripts/test-intelligence-vertical-isolation.ts
// System-wide test that verifies vertical isolation between Salon and Transpo.
//
// Tests:
//   1. Salon config exists and includes salon-specific platforms
//   2. Transpo config exists and does NOT include salon platforms
//   3. Transpo config DOES include transport-relevant platforms
//   4. Route files exist for all four verticals
//   5. Transpo runtime folders exist
//   6. No Transpo page source contains banned salon strings
//
// Usage: npm run test:intelligence
// Exit: 0 = all pass, 1 = one or more failures

import { promises as fs } from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const PASS = "\x1b[32mPASS\x1b[0m";
const FAIL = "\x1b[31mFAIL\x1b[0m";

let failures = 0;

function pass(msg: string) {
  console.log(`  ${PASS}  ${msg}`);
}

function fail(msg: string) {
  console.log(`  ${FAIL}  ${msg}`);
  failures++;
}

async function fileExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

async function readText(relPath: string): Promise<string> {
  return fs.readFile(path.join(ROOT, relPath), "utf8");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n\x1b[1mIntelligence Vertical Isolation Test\x1b[0m");
  console.log("─".repeat(54));

  // ── 1. Salon config ──────────────────────────────────────────────────────

  console.log("\n1. Salon config — includes salon platforms");

  const salonPath = "lib/intelligence/verticals/salon.config.ts";
  if (!await fileExists(salonPath)) {
    fail(`Salon config not found at ${salonPath}`);
  } else {
    const src = await readText(salonPath);
    const required = ["glossgenius", "styleseat", "vagaro"];
    for (const platform of required) {
      if (src.includes(platform)) {
        pass(`Salon config includes platform: ${platform}`);
      } else {
        fail(`Salon config MISSING platform: ${platform}`);
      }
    }
    if (src.includes("verticalKey") && src.includes('"salon"')) {
      pass("Salon config has verticalKey: salon");
    } else {
      fail("Salon config missing verticalKey: salon");
    }
  }

  // ── 2. Transpo config — does NOT include salon platforms ─────────────────

  console.log("\n2. Transpo config — excludes salon platforms");

  const transpoPath = "lib/intelligence/verticals/transpo.config.ts";
  if (!await fileExists(transpoPath)) {
    fail(`Transpo config not found at ${transpoPath}`);
  } else {
    const src = await readText(transpoPath);
    const banned = ["glossgenius", "styleseat", "vagaro", "salon-suite"];
    for (const banned_platform of banned) {
      // It may appear in the hiddenTools list — that's OK, it means it's explicitly excluded.
      // What we check is it's NOT in allowedPlatforms.
      // Simple heuristic: not in the allowedPlatforms array line.
      // We look for it NOT in the allowedPlatforms section.
      // More precisely: check it doesn't appear as an active allowed platform key.
      // Strategy: scan for it outside of the hiddenTools / comment context.
      const allowedMatch = src.match(/allowedPlatforms:\s*\[([\s\S]*?)\]/);
      const allowedSection = allowedMatch?.[1] ?? "";
      if (allowedSection.includes(banned_platform)) {
        fail(`Transpo allowedPlatforms CONTAINS banned salon platform: ${banned_platform}`);
      } else {
        pass(`Transpo allowedPlatforms does not include: ${banned_platform}`);
      }
    }
    if (src.includes("verticalKey") && src.includes('"transpo"')) {
      pass("Transpo config has verticalKey: transpo");
    } else {
      fail("Transpo config missing verticalKey: transpo");
    }
  }

  // ── 3. Transpo config — includes transport platforms ─────────────────────

  console.log("\n3. Transpo config — includes transport platforms");

  if (await fileExists(transpoPath)) {
    const src = await readText(transpoPath);
    const required = ["fmcsa", "safer", "dot", "linkedin", "website"];
    for (const platform of required) {
      if (src.includes(platform)) {
        pass(`Transpo config includes platform: ${platform}`);
      } else {
        fail(`Transpo config MISSING platform: ${platform}`);
      }
    }
  }

  // ── 4. Route files exist ──────────────────────────────────────────────────

  console.log("\n4. Route files exist for all verticals");

  const routes: Array<[string, string]> = [
    ["app/(app)/admin/intelligence/salon/page.tsx",                         "/admin/intelligence/salon"],
    ["app/(app)/admin/intelligence/transpo/page.tsx",                       "/admin/intelligence/transpo"],
    ["app/(app)/admin/intelligence/transpo/source-ingest/page.tsx",         "/admin/intelligence/transpo/source-ingest"],
    ["app/(app)/admin/intelligence/transpo/resolver/page.tsx",              "/admin/intelligence/transpo/resolver"],
    ["app/(app)/admin/intelligence/transpo/harvest/page.tsx",               "/admin/intelligence/transpo/harvest"],
    ["app/(app)/admin/intelligence/transpo/prospects/page.tsx",             "/admin/intelligence/transpo/prospects"],
    ["app/(app)/admin/intelligence/hcare/page.tsx",                         "/admin/intelligence/hcare"],
    ["app/(app)/admin/intelligence/labs/page.tsx",                          "/admin/intelligence/labs"],
  ];

  for (const [file, route] of routes) {
    if (await fileExists(file)) {
      pass(`Route file exists: ${route}`);
    } else {
      fail(`Route file MISSING: ${route}  (expected at ${file})`);
    }
  }

  // ── 5. Transpo runtime folders ────────────────────────────────────────────

  console.log("\n5. Transpo runtime folders exist");

  const runtimeFolders = [
    "runtime-data/intelligence/transpo/source-runs",
    "runtime-data/intelligence/transpo/prospects",
  ];
  for (const folder of runtimeFolders) {
    if (await fileExists(folder)) {
      pass(`Runtime folder exists: ${folder}`);
    } else {
      fail(`Runtime folder MISSING: ${folder}`);
    }
  }

  // ── 6. No banned salon strings in Transpo page sources ───────────────────

  console.log("\n6. Transpo pages contain no banned salon strings");

  const transpoPagePaths = [
    "app/(app)/admin/intelligence/transpo/source-ingest/page.tsx",
    "app/(app)/admin/intelligence/transpo/resolver/page.tsx",
    "app/(app)/admin/intelligence/transpo/harvest/page.tsx",
    "app/(app)/admin/intelligence/transpo/prospects/page.tsx",
  ];

  const BANNED_STRINGS = [
    "GlossGenius",
    "StyleSeat",
    "salon suite",
    "nail",
    "lashes",
    "esthetician",
  ];

  for (const pagePath of transpoPagePaths) {
    if (!await fileExists(pagePath)) {
      fail(`Transpo page not found: ${pagePath}`);
      continue;
    }
    const src = await readText(pagePath);
    const found = BANNED_STRINGS.filter((s) => src.includes(s));
    if (found.length === 0) {
      pass(`No banned strings in: ${path.basename(path.dirname(pagePath))}/page.tsx`);
    } else {
      fail(`Banned strings found in ${pagePath}: ${found.join(", ")}`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n" + "─".repeat(54));
  if (failures === 0) {
    console.log(`\x1b[32m✓ All tests passed\x1b[0m\n`);
    process.exit(0);
  } else {
    console.log(`\x1b[31m✗ ${failures} test${failures !== 1 ? "s" : ""} failed\x1b[0m\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
