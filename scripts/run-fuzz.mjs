/**
 * Runs Schemathesis against the live OpenAPI URL (Python package, not npm).
 */
import { spawnSync } from "child_process";

const schemaUrl = process.env.FUZZ_OPENAPI_URL ?? "http://localhost:3000/openapi.yaml";
const baseUrl = process.env.FUZZ_BASE_URL ?? "http://localhost:3000";
const extra = process.argv.slice(2);

const candidates = [{ cmd: "schemathesis", args: [] }];

/** Schemathesis 4.x: use `-n` for max examples; Hypothesis deadline flags were removed from CLI. */
const baseArgs = [
  "run",
  schemaUrl,
  "-u",
  baseUrl,
  "--checks",
  "all",
  "-n",
  "100",
  ...extra,
];

let lastStatus = 1;

for (const { cmd, args } of candidates) {
  const fullArgs = [...args, ...baseArgs];
  const res = spawnSync(cmd, fullArgs, { stdio: "inherit", shell: process.platform === "win32" });
  if (res.error && res.error.code === "ENOENT") continue;
  lastStatus = res.status ?? 1;
  process.exit(lastStatus);
}

console.error(
  "Schemathesis not found. Install with: pip install schemathesis  (or add to PATH)",
);
process.exit(lastStatus);
