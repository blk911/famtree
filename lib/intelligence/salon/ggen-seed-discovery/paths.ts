// lib/intelligence/salon/ggen-seed-discovery/paths.ts
// Vercel serverless mounts /var/task read-only; /tmp is the only writable dir.

import path from "path";

export function getGgenDiscoveryDataDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "studios-ggen-discovery");
  }
  return path.resolve(process.cwd(), "runtime-data", "studios", "ggen-seed-discovery");
}

export function getGgenDiscoveryRunsDir(): string {
  return path.join(getGgenDiscoveryDataDir(), "runs");
}

export function getGgenDiscoveryIndexPath(): string {
  return path.join(getGgenDiscoveryDataDir(), "index.json");
}
