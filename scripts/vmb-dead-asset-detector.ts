/**
 * VMB Dead Asset Detector
 *
 * Validates VMB visual assets for reachability and dimensions.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { inviteArtLibrary } from "../lib/vmb/assets/invite-art-library";
import { servicePhotoLibrary } from "../lib/vmb/assets/service-photo-library";

type AssetCandidate = {
  id: string;
  category: string;
  url: string;
};

type AssetReport = AssetCandidate & {
  status: "healthy" | "warning" | "broken";
  httpStatus: number | "local" | "missing";
  width?: number;
  height?: number;
  errors: string[];
};

const ROOT = process.cwd();
const SCAN_ROOTS = ["app/vmb", "components/vmb", "lib/vmb", "runtime-data/vmb"];
const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i;

function assetKey(candidate: AssetCandidate): string {
  return `${candidate.category}:${candidate.id}:${candidate.url}`;
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "docs", "__tests__", "fixtures"].includes(entry.name)) continue;
      files.push(...(await collectFiles(full)));
    } else if (entry.isFile() && /\.(json|jsx?|tsx?)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function collectCandidates(): Promise<AssetCandidate[]> {
  const candidates = new Map<string, AssetCandidate>();
  for (const asset of servicePhotoLibrary.filter((row) => row.active)) {
    for (const [kind, url] of [
      ["service photo", asset.imageUrl],
      ["thumbnail", asset.thumbnailUrl],
    ] as const) {
      if (!url) continue;
      const candidate = { id: `${asset.id}:${kind}`, category: asset.category, url };
      candidates.set(assetKey(candidate), candidate);
    }
  }

  for (const asset of inviteArtLibrary.filter((row) => row.active)) {
    for (const [kind, url] of [
      ["invite artwork", asset.imageUrl],
      ["invite thumbnail", asset.thumbnailUrl],
    ] as const) {
      if (!url) continue;
      const candidate = { id: `${asset.id}:${kind}`, category: asset.category, url };
      candidates.set(assetKey(candidate), candidate);
    }
  }

  const files = (await Promise.all(SCAN_ROOTS.map((root) => collectFiles(path.join(ROOT, root))))).flat();
  for (const file of files) {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const matches = text.matchAll(/["'`](https?:\/\/[^"'`\s)]+|\/[^"'`\s)]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^"'`\s)]*)?)["'`]/gi);
    for (const match of matches) {
      const url = match[1];
      if (url.includes("${")) continue;
      if (!IMAGE_EXTENSIONS.test(url) && !/^https?:\/\/images\.(unsplash|pexels)\.com/i.test(url)) continue;
      const category = rel.includes("invite") ? "invite artwork" : rel.includes("salon") ? "salon hero image" : "visual asset";
      const candidate = { id: rel, category, url };
      candidates.set(assetKey(candidate), candidate);
    }
  }

  return [...candidates.values()].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

async function imageDimensions(buffer: Buffer): Promise<{ width?: number; height?: number }> {
  try {
    const sharp = (await import("sharp")).default;
    const metadata = await sharp(buffer).metadata();
    return { width: metadata.width, height: metadata.height };
  } catch {
    return {};
  }
}

async function validateLocal(candidate: AssetCandidate): Promise<AssetReport> {
  const errors: string[] = [];
  const localPath = path.join(ROOT, "public", candidate.url.replace(/^\//, "").split("?")[0]);
  const buffer = await fs.readFile(localPath).catch(() => null);
  if (!buffer) {
    return { ...candidate, status: "broken", httpStatus: "missing", errors: [`missing local file: ${localPath}`] };
  }
  const dims = await imageDimensions(buffer);
  if (!dims.width || !dims.height) errors.push("could not read image dimensions");
  return {
    ...candidate,
    ...dims,
    status: errors.length ? "warning" : "healthy",
    httpStatus: "local",
    errors,
  };
}

async function validateRemote(candidate: AssetCandidate): Promise<AssetReport> {
  const errors: string[] = [];
  let httpStatus = 0;
  try {
    const head = await fetchWithTimeout(candidate.url, { method: "HEAD" });
    httpStatus = head.status;
    if (!head.ok) {
      const get = await fetchWithTimeout(candidate.url, { method: "GET" });
      httpStatus = get.status;
      if (!get.ok) errors.push(`HTTP ${get.status}`);
      const buffer = Buffer.from(await get.arrayBuffer());
      const dims = await imageDimensions(buffer);
      if (!dims.width || !dims.height) errors.push("could not read image dimensions");
      return { ...candidate, ...dims, status: errors.length ? "broken" : "healthy", httpStatus, errors };
    }

    const get = await fetchWithTimeout(candidate.url, { method: "GET" });
    httpStatus = get.status;
    if (!get.ok) errors.push(`HTTP ${get.status}`);
    const buffer = Buffer.from(await get.arrayBuffer());
    const dims = await imageDimensions(buffer);
    if (!dims.width || !dims.height) errors.push("could not read image dimensions");
    return {
      ...candidate,
      ...dims,
      status: errors.length ? "broken" : "healthy",
      httpStatus,
      errors,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { ...candidate, status: "broken", httpStatus, errors };
  }
}

async function run(): Promise<void> {
  const candidates = await collectCandidates();
  const reports: AssetReport[] = [];

  for (const candidate of candidates) {
    reports.push(candidate.url.startsWith("/") ? await validateLocal(candidate) : await validateRemote(candidate));
  }

  const healthy = reports.filter((report) => report.status === "healthy").length;
  const warnings = reports.filter((report) => report.status === "warning").length;
  const broken = reports.filter((report) => report.status === "broken").length;

  console.log("Asset ID | Category | URL | Status | HTTP | Dimensions | Errors");
  console.log("--- | --- | --- | --- | --- | --- | ---");
  for (const report of reports) {
    const dimensions = report.width && report.height ? `${report.width}x${report.height}` : "unknown";
    console.log(
      `${report.id} | ${report.category} | ${report.url} | ${report.status} | ${report.httpStatus} | ${dimensions} | ${report.errors.join("; ") || "None"}`,
    );
  }
  console.log(`\nTotal assets: ${reports.length}`);
  console.log(`Healthy assets: ${healthy}`);
  console.log(`Broken assets: ${broken}`);
  console.log(`Warnings: ${warnings}`);

  if (broken > 0) process.exit(1);
}

void run().catch((err) => {
  console.error("FAIL: VMB Dead Asset Detector crashed");
  console.error(err);
  process.exit(1);
});
