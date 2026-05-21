#!/usr/bin/env node
/**
 * Regression guard: feature UI must not return to globals.css.
 * See docs/ui/styling-contract.md
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const globalsPath = path.join(root, "app", "globals.css");
const css = readFileSync(globalsPath, "utf8");

/** Selectors removed in LT styling foundation — must never reappear. */
const FORBIDDEN_SELECTOR_PATTERNS = [
  /\.dashboard-activity-cta\b/,
  /\.dashboard-activity-cta__/,
  /\.dashboard-member-stack\b/,
];

const violations = [];
for (const pattern of FORBIDDEN_SELECTOR_PATTERNS) {
  if (pattern.test(css)) {
    violations.push(pattern.toString());
  }
}

if (violations.length > 0) {
  console.error("globals.css allowlist check FAILED.");
  console.error("Forbidden selectors found (use components/ui + Tailwind instead):");
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log("globals.css allowlist check passed.");
