// lib/studios/source-runs/store.ts

import { mkdir, readFile, writeFile } from "fs/promises";
import { getSalonSourceRunsArtifactPath, getSalonSourceRunsDir } from "./paths";
import type { SalonSourceRunRecord, SalonSourceRunsArtifact } from "./types";

export { getSalonSourceRunsArtifactPath, getSalonSourceRunsDir };

export async function readSalonSourceRuns(): Promise<SalonSourceRunsArtifact> {
  try {
    const raw = await readFile(getSalonSourceRunsArtifactPath(), "utf8");
    const parsed = JSON.parse(raw) as SalonSourceRunsArtifact;
    if (!Array.isArray(parsed.runs)) {
      return { generatedAt: new Date().toISOString(), runs: [] };
    }
    return parsed;
  } catch {
    return { generatedAt: new Date().toISOString(), runs: [] };
  }
}

export async function appendSalonSourceRun(
  run: SalonSourceRunRecord,
): Promise<SalonSourceRunsArtifact> {
  const artifact = await readSalonSourceRuns();
  artifact.runs.unshift(run);
  artifact.generatedAt = new Date().toISOString();

  await mkdir(getSalonSourceRunsDir(), { recursive: true });
  await writeFile(
    getSalonSourceRunsArtifactPath(),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  return artifact;
}
