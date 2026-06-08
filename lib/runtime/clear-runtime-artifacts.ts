// lib/runtime/clear-runtime-artifacts.ts

import path from "node:path";
import { readdir, stat, unlink } from "node:fs/promises";
import {
  getRuntimeClearTarget,
  type RuntimeClearScope,
  type RuntimeClearTarget,
} from "./clear-runtime-config";

export interface ClearRuntimeArtifactsOptions {
  dryRun?: boolean;
}

export interface ClearRuntimeArtifactsResult {
  scope: RuntimeClearScope;
  dryRun: boolean;
  deletedFiles: string[];
  preservedFiles: string[];
  protectedFiles: string[];
  skippedFiles: string[];
  errors: string[];
}

const RUNTIME_DATA_ROOT = path.resolve(process.cwd(), "runtime-data");

const FORBIDDEN_SEGMENTS = [
  "package.json",
  "node_modules",
  path.sep + "lib" + path.sep,
  path.sep + "app" + path.sep,
  path.sep + "components" + path.sep,
  path.sep + "scripts" + path.sep,
];

function normalizeRelPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizeRelPath(pattern);
  let regex = "^";
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const next = normalized[i + 1];
    if (ch === "*" && next === "*") {
      regex += ".*";
      i += 1;
      if (normalized[i + 1] === "/") i += 1;
      continue;
    }
    if (ch === "*") {
      regex += "[^/]*";
      continue;
    }
    if (ch === "?") {
      regex += "[^/]";
      continue;
    }
    regex += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  regex += "$";
  return new RegExp(regex);
}

function matchesGlob(filePath: string, pattern: string): boolean {
  return globToRegExp(pattern).test(normalizeRelPath(filePath));
}

function matchesAnyGlob(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesGlob(filePath, pattern));
}

function assertSafeRuntimeFile(relPath: string): string | null {
  const normalized = normalizeRelPath(relPath);
  const resolved = path.resolve(process.cwd(), normalized);

  if (
    resolved !== RUNTIME_DATA_ROOT &&
    !resolved.startsWith(RUNTIME_DATA_ROOT + path.sep)
  ) {
    return `Refused path outside runtime-data: ${normalized}`;
  }

  for (const segment of FORBIDDEN_SEGMENTS) {
    if (resolved.includes(segment.replace(/\//g, path.sep))) {
      return `Refused forbidden path segment: ${normalized}`;
    }
  }

  return null;
}

async function walkRuntimeFiles(
  dirRel: string,
  files: string[] = [],
): Promise<string[]> {
  const dirAbs = path.resolve(process.cwd(), dirRel);
  if (
    dirAbs !== RUNTIME_DATA_ROOT &&
    !dirAbs.startsWith(RUNTIME_DATA_ROOT + path.sep)
  ) {
    return files;
  }

  let entries;
  try {
    entries = await readdir(dirAbs, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const rel = normalizeRelPath(path.join(dirRel, entry.name));
    const abs = path.resolve(process.cwd(), rel);
    if (entry.isDirectory()) {
      await walkRuntimeFiles(rel, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(rel);
    } else if (!entry.isSymbolicLink()) {
      // Skip non-regular files.
      void abs;
    }
  }

  return files;
}

async function expandGlobs(patterns: string[]): Promise<string[]> {
  if (patterns.length === 0) return [];

  const allFiles = await walkRuntimeFiles("runtime-data");
  const matched = new Set<string>();

  for (const file of allFiles) {
    if (matchesAnyGlob(file, patterns)) {
      matched.add(file);
    }
  }

  return Array.from(matched).sort();
}

export async function collectRuntimeClearCandidates(
  target: RuntimeClearTarget,
): Promise<{ toDelete: string[]; preserved: string[]; skipped: string[]; errors: string[] }> {
  const generated = await expandGlobs(target.generatedGlobs);
  const toDelete: string[] = [];
  const preserved: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const relPath of generated) {
    const safetyError = assertSafeRuntimeFile(relPath);
    if (safetyError) {
      skipped.push(relPath);
      errors.push(safetyError);
      continue;
    }

    const resolved = path.resolve(process.cwd(), relPath);
    let fileStat;
    try {
      fileStat = await stat(resolved);
    } catch {
      skipped.push(relPath);
      continue;
    }

    if (!fileStat.isFile()) {
      skipped.push(relPath);
      errors.push(`Refused deleting non-file path: ${relPath}`);
      continue;
    }

    if (matchesAnyGlob(relPath, target.preserveGlobs)) {
      preserved.push(relPath);
      continue;
    }

    toDelete.push(relPath);
  }

  return { toDelete, preserved, skipped, errors };
}

export async function clearRuntimeArtifacts(
  scope: RuntimeClearScope,
  options: ClearRuntimeArtifactsOptions = {},
): Promise<ClearRuntimeArtifactsResult> {
  const dryRun = options.dryRun === true;
  const target = getRuntimeClearTarget(scope);
  const { toDelete, preserved, skipped, errors } = await collectRuntimeClearCandidates(target);

  const deletedFiles: string[] = [];

  if (!dryRun) {
    for (const relPath of toDelete) {
      const safetyError = assertSafeRuntimeFile(relPath);
      if (safetyError) {
        skipped.push(relPath);
        errors.push(safetyError);
        continue;
      }

      try {
        await unlink(path.resolve(process.cwd(), relPath));
        deletedFiles.push(relPath);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`Failed to delete ${relPath}: ${message}`);
        skipped.push(relPath);
      }
    }
  } else {
    deletedFiles.push(...toDelete);
  }

  const protectedFiles = await expandGlobs(target.preserveGlobs);

  return {
    scope,
    dryRun,
    deletedFiles,
    preservedFiles: preserved,
    protectedFiles,
    skippedFiles: skipped,
    errors,
  };
}

export async function dryRunIsolationCheck(): Promise<{
  salonIncludesTranspo: string[];
  transpoIncludesSalonOrMarkets: string[];
  transpoPreservesSidecars: string[];
}> {
  const salon = await clearRuntimeArtifacts("salon", { dryRun: true });
  const transpo = await clearRuntimeArtifacts("transpo", { dryRun: true });

  const salonIncludesTranspo = salon.deletedFiles.filter((f) => f.includes("/transpo/"));
  const transpoIncludesSalonOrMarkets = transpo.deletedFiles.filter(
    (f) => f.includes("/sola/") || f.includes("/markets/") || f.includes("/salon/"),
  );

  const preservePatterns = getRuntimeClearTarget("transpo").preserveGlobs;
  const transpoPreservesSidecars = transpo.deletedFiles.filter((f) =>
    matchesAnyGlob(f, preservePatterns),
  );

  return {
    salonIncludesTranspo,
    transpoIncludesSalonOrMarkets,
    transpoPreservesSidecars,
  };
}
