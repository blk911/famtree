// lib/studios/styleseat/store.ts
// Saves and loads StyleSeat harvest artifacts.
// Backward compatible with the original flat {runId}.json files while also
// writing inspectable per-run artifacts under runs/{runId}/.

import { promises as fs } from "fs";
import path from "path";
import type { StyleSeatRunFile, StyleSeatRunReport } from "./types";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/studios-styleseat"
  : path.resolve(process.cwd(), "runtime-data", "studios", "styleseat");

const ARTIFACT_NAMES = [
  "crawl",
  "raw",
  "normalized",
  "resolver",
  "prospects",
  "failures",
  "summary",
  "log",
  "market-intelligence",
  "operator-scores",
  "market-clusters",
  "prospect-persistence-audit",
] as const;
type ArtifactName = typeof ARTIFACT_NAMES[number];

export function getStyleSeatDataRoot(): string {
  return DATA_DIR;
}

async function ensureDir(dir = DATA_DIR): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function safeRunId(runId: string): string {
  return runId.replace(/[^a-z0-9_\-]/gi, "-").slice(0, 80);
}

function flatFilePath(runId: string): string {
  return path.join(DATA_DIR, `${safeRunId(runId)}.json`);
}

function runDir(runId: string): string {
  return path.join(DATA_DIR, "runs", safeRunId(runId));
}

function artifactPath(runId: string, name: ArtifactName): string {
  return path.join(runDir(runId), `${name}.json`);
}

export function getStyleSeatArtifactPaths(runId: string): Record<ArtifactName, string> {
  return Object.fromEntries(
    ARTIFACT_NAMES.map((name) => [name, path.relative(DATA_DIR, artifactPath(runId, name)).replace(/\\/g, "/")])
  ) as Record<ArtifactName, string>;
}

export function generateStyleSeatRunId(): string {
  return `styleseat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildFallbackReport(file: StyleSeatRunFile): StyleSeatRunReport {
  const run = file.run;
  return {
    runId:     run.runId,
    createdAt: run.createdAt,
    market:    run.market,
    categories: run.categories,
    mode:      run.mode,
    totals: {
      harvested:        run.totalHarvested,
      crawledUrls:      file.crawl?.crawledUrls.length ?? run.report?.totals.crawledUrls ?? 0,
      profileUrls:      file.crawl?.profileUrls.length ?? run.report?.totals.profileUrls ?? run.totalHarvested,
      internalApiUrlsTried: file.crawl?.debug?.internalApiUrlsTried?.length ?? run.report?.totals.internalApiUrlsTried ?? 0,
      internalApiUrlsSucceeded: file.crawl?.debug?.internalApiUrlsSucceeded?.length ?? run.report?.totals.internalApiUrlsSucceeded ?? 0,
      internalApiUrlsFailed: file.crawl?.debug?.internalApiUrlsFailed?.length ?? run.report?.totals.internalApiUrlsFailed ?? 0,
      internalApiRecords: file.crawl?.debug?.internalApiRecords ?? run.report?.totals.internalApiRecords ?? 0,
      normalized:       file.normalized?.length ?? file.operators.length,
      igCandidates:     run.totalIgFound,
      resolverMerged:   file.results.filter((r) => r.prospectId).length,
      prospectsCreated: run.savedCount,
      prospectsUpdated: 0,
      prospectsAttempted: file.report?.totals.prospectsAttempted ?? file.prospectPersistenceAudit?.filter((entry) => entry.attemptedSave).length ?? 0,
      prospectsSkipped: file.report?.totals.prospectsSkipped ?? file.prospectPersistenceAudit?.filter((entry) => entry.skippedReason).length ?? 0,
      prospectsFailed: file.report?.totals.prospectsFailed ?? file.prospectPersistenceAudit?.filter((entry) => entry.attemptedSave && !entry.saved && !entry.skippedReason).length ?? 0,
      unresolved:       file.results.filter((r) => r.status === "unresolved").length,
      failed:           run.failedToSaveCount + (file.failures?.length ?? 0),
    },
    artifactPaths: getStyleSeatArtifactPaths(run.runId),
    discoveryMode: run.discoveryMode,
    sourceUrl: run.sourceUrl ?? null,
    seedUrls: run.seedUrls ?? file.crawl?.seedUrls ?? [],
    marketSearchInput: run.discoveryMode === "market_search" ? { city: run.market, state: run.state } : null,
    crawlDepth: run.crawlDepth,
    maxOperators: run.maxOperators,
    resolverMode: run.resolverMode,
    pipelineMode: run.mode,
    discoveredMarkets: run.discoveredMarkets ?? file.crawl?.discoveredMarkets ?? [],
    discoveredCategories: run.discoveredCategories ?? file.crawl?.discoveredCategories ?? [],
    extractionSource: run.report?.extractionSource ?? file.crawl?.debug?.extractionSource ?? "none",
    notes: run.errors ?? [],
  };
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export async function saveStyleSeatRun(file: StyleSeatRunFile): Promise<void> {
  await ensureDir();
  const report = file.report ?? file.run.report ?? buildFallbackReport(file);
  const run = { ...file.run, report };
  const fullFile: StyleSeatRunFile = { ...file, run, report };

  await writeJson(flatFilePath(run.runId), fullFile);

  const dir = runDir(run.runId);
  await ensureDir(dir);
  await writeJson(artifactPath(run.runId, "crawl"), fullFile.crawl ?? null);
  await writeJson(artifactPath(run.runId, "raw"), fullFile.operators);
  await writeJson(artifactPath(run.runId, "normalized"), fullFile.normalized ?? []);
  await writeJson(artifactPath(run.runId, "resolver"), fullFile.results);
  await writeJson(artifactPath(run.runId, "prospects"), fullFile.prospects ?? []);
  await writeJson(artifactPath(run.runId, "failures"), fullFile.failures ?? run.saveErrors ?? []);
  await writeJson(artifactPath(run.runId, "summary"), report);
  await writeJson(artifactPath(run.runId, "log"), fullFile.log ?? []);
  await writeJson(artifactPath(run.runId, "market-intelligence"), fullFile.intelligence ?? null);
  await writeJson(artifactPath(run.runId, "operator-scores"), fullFile.operatorScores ?? fullFile.intelligence?.operators ?? []);
  await writeJson(artifactPath(run.runId, "market-clusters"), fullFile.marketClusters ?? fullFile.intelligence?.clusters ?? []);
  await writeJson(artifactPath(run.runId, "prospect-persistence-audit"), fullFile.prospectPersistenceAudit ?? []);
}

async function loadFromArtifacts(runId: string): Promise<StyleSeatRunFile | null> {
  const report = await readJson<StyleSeatRunReport>(artifactPath(runId, "summary"));
  if (!report) return null;

  const flat = await readJson<StyleSeatRunFile>(flatFilePath(runId));
  const run = flat?.run ?? {
    runId: report.runId,
    batchId: "",
    createdAt: report.createdAt,
    market: report.market,
    state: "",
    categories: report.categories,
    mode: report.mode,
    resolverMode: "fast",
    apifyActorRunId: null,
    totalHarvested: report.totals.harvested,
    totalIgFound: report.totals.igCandidates,
    totalResolved: report.totals.resolverMerged,
    totalProspects: report.totals.prospectsCreated + report.totals.prospectsUpdated,
    savedCount: report.totals.prospectsCreated + report.totals.prospectsUpdated,
    failedToSaveCount: report.totals.failed,
    saveErrors: [],
    errors: report.notes,
    prospectStorePath: null,
    prospectsBeforeCount: 0,
    prospectsAfterCount: 0,
    savedHandles: [],
    report,
  };

  return {
    run: { ...run, report },
    operators:  await readJson<StyleSeatRunFile["operators"]>(artifactPath(runId, "raw")) ?? flat?.operators ?? [],
    crawl:      await readJson<StyleSeatRunFile["crawl"]>(artifactPath(runId, "crawl")) ?? flat?.crawl ?? null,
    normalized: await readJson<unknown[]>(artifactPath(runId, "normalized")) ?? flat?.normalized ?? [],
    results:    await readJson<StyleSeatRunFile["results"]>(artifactPath(runId, "resolver")) ?? flat?.results ?? [],
    prospects:  await readJson<unknown[]>(artifactPath(runId, "prospects")) ?? flat?.prospects ?? [],
    failures:   await readJson<unknown[]>(artifactPath(runId, "failures")) ?? flat?.failures ?? [],
    prospectPersistenceAudit: await readJson<StyleSeatRunFile["prospectPersistenceAudit"]>(artifactPath(runId, "prospect-persistence-audit")) ?? flat?.prospectPersistenceAudit ?? [],
    log:        await readJson<unknown[]>(artifactPath(runId, "log")) ?? flat?.log ?? [],
    intelligence: await readJson<StyleSeatRunFile["intelligence"]>(artifactPath(runId, "market-intelligence")) ?? flat?.intelligence ?? null,
    operatorScores: await readJson<StyleSeatRunFile["operatorScores"]>(artifactPath(runId, "operator-scores")) ?? flat?.operatorScores ?? [],
    marketClusters: await readJson<StyleSeatRunFile["marketClusters"]>(artifactPath(runId, "market-clusters")) ?? flat?.marketClusters ?? [],
    report,
  };
}

export async function loadStyleSeatRun(runId: string): Promise<StyleSeatRunFile | null> {
  const artifact = await loadFromArtifacts(runId);
  if (artifact) return artifact;

  const flat = await readJson<StyleSeatRunFile>(flatFilePath(runId));
  if (!flat) return null;

  const report = flat.report ?? flat.run.report ?? buildFallbackReport(flat);
  return {
    ...flat,
    crawl:      flat.crawl ?? null,
    normalized: flat.normalized ?? [],
    prospects:  flat.prospects ?? [],
    failures:   flat.failures ?? flat.run.saveErrors ?? [],
    prospectPersistenceAudit: flat.prospectPersistenceAudit ?? [],
    log:        flat.log ?? [],
    intelligence: flat.intelligence ?? null,
    operatorScores: flat.operatorScores ?? [],
    marketClusters: flat.marketClusters ?? [],
    report,
    run:        { ...flat.run, report },
  };
}

export async function listStyleSeatRuns(): Promise<StyleSeatRunFile[]> {
  await ensureDir();
  const byRunId = new Map<string, StyleSeatRunFile>();

  try {
    const files = await fs.readdir(DATA_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const loaded = await readJson<StyleSeatRunFile>(path.join(DATA_DIR, file));
      if (loaded?.run?.runId) {
        const report = loaded.report ?? loaded.run.report ?? buildFallbackReport(loaded);
        byRunId.set(loaded.run.runId, {
          ...loaded,
          run: { ...loaded.run, report },
          operators: [],
          results: [],
          report,
        });
      }
    }
  } catch {
    return [];
  }

  try {
    const runsRoot = path.join(DATA_DIR, "runs");
    const dirs = await fs.readdir(runsRoot, { withFileTypes: true });
    for (const dirent of dirs) {
      if (!dirent.isDirectory()) continue;
      const loaded = await loadFromArtifacts(dirent.name);
      if (loaded?.run?.runId) {
        byRunId.set(loaded.run.runId, { ...loaded, operators: [], results: [] });
      }
    }
  } catch {
    // no artifact folder yet
  }

  return Array.from(byRunId.values()).sort((a, b) => b.run.createdAt.localeCompare(a.run.createdAt));
}
