// lib/operators/sources/sola/paths.ts
// Vercel serverless mounts /var/task read-only; /tmp is the only writable dir.

import path from "path";

export function getSolaDataDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "sola");
  }
  return path.join(process.cwd(), "runtime-data", "sola");
}
