// lib/operators/sources/sola/read-sola-resolver-import.ts

import { readFile } from "fs/promises";
import { RESOLVER_IMPORT_ARTIFACT_PATH } from "./build-resolver-import";
import type { SolaResolverImportArtifact } from "./types";

export { RESOLVER_IMPORT_ARTIFACT_PATH };

export async function readSolaResolverImport(
  artifactPath: string = RESOLVER_IMPORT_ARTIFACT_PATH,
): Promise<SolaResolverImportArtifact | null> {
  try {
    const raw = await readFile(artifactPath, "utf8");
    return JSON.parse(raw) as SolaResolverImportArtifact;
  } catch {
    return null;
  }
}
