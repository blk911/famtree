// lib/studios/source-runs/paths.ts

import path from "path";

export function getSalonSourceRunsDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "studios", "source-runs");
  }
  return path.join(process.cwd(), "runtime-data", "studios", "source-runs");
}

export function getSalonSourceRunsArtifactPath(): string {
  return path.join(getSalonSourceRunsDir(), "source-runs.generated.json");
}
