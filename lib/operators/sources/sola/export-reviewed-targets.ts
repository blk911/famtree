// lib/operators/sources/sola/export-reviewed-targets.ts

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSolaDataDir } from "./paths";
import { readSolaResolverImport } from "./read-sola-resolver-import";
import { readSolaReviewStates } from "./sola-review-state-store";
import type {
  SolaCategoryBucket,
  SolaResolverImportRecord,
  SolaReviewState,
} from "./types";

export const SOLA_REVIEWED_TARGETS_JSON_PATH = path.join(
  getSolaDataDir(),
  "sola-reviewed-targets.generated.json",
);

export const SOLA_REVIEWED_TARGETS_CSV_PATH = path.join(
  getSolaDataDir(),
  "sola-reviewed-targets.csv",
);

function isExportableReviewStatus(
  status: SolaReviewState["reviewStatus"],
): status is SolaReviewedTargetReviewStatus {
  return status === "valid" || status === "priority";
}

export type SolaReviewedTargetReviewStatus = "valid" | "priority";

export interface SolaReviewedTargetExport {
  rank: number;
  reviewStatus: SolaReviewedTargetReviewStatus;
  candidateKey: string;
  operatorName: string;
  displayName: string;
  professionalName?: string;
  businessName?: string;
  locationSlug: string;
  locationName?: string;
  suiteNumber?: string;
  phones: string[];
  bookingLinks: string[];
  website?: string;
  socialLinks: string[];
  categoryBuckets: SolaCategoryBucket[];
  acquisitionScore: number;
  contactabilityScore: number;
  notes: string;
  profileUrl?: string;
}

export interface SolaReviewedTargetsArtifact {
  generatedAt: string;
  exportedCount: number;
  targets: SolaReviewedTargetExport[];
}

function compareTargets(
  a: { reviewStatus: SolaReviewedTargetReviewStatus; record: SolaResolverImportRecord },
  b: { reviewStatus: SolaReviewedTargetReviewStatus; record: SolaResolverImportRecord },
): number {
  if (a.reviewStatus === "priority" && b.reviewStatus !== "priority") return -1;
  if (b.reviewStatus === "priority" && a.reviewStatus !== "priority") return 1;
  if (b.record.acquisitionScore !== a.record.acquisitionScore) {
    return b.record.acquisitionScore - a.record.acquisitionScore;
  }
  if (b.record.contactabilityScore !== a.record.contactabilityScore) {
    return b.record.contactabilityScore - a.record.contactabilityScore;
  }
  return a.record.operatorName.localeCompare(b.record.operatorName, undefined, {
    sensitivity: "base",
  });
}

function toExportRow(
  rank: number,
  reviewStatus: SolaReviewedTargetReviewStatus,
  record: SolaResolverImportRecord,
  notes: string,
): SolaReviewedTargetExport {
  return {
    rank,
    reviewStatus,
    candidateKey: record.candidateKey,
    operatorName: record.operatorName,
    displayName: record.displayName,
    professionalName: record.professionalName,
    businessName: record.businessName,
    locationSlug: record.locationSlug,
    locationName: record.locationName,
    suiteNumber: record.suiteNumber,
    phones: record.phones,
    bookingLinks: record.bookingLinks,
    website: record.website,
    socialLinks: record.socialLinks,
    categoryBuckets: record.categoryBuckets,
    acquisitionScore: record.acquisitionScore,
    contactabilityScore: record.contactabilityScore,
    notes,
    profileUrl: record.profileUrl,
  };
}

export function buildSolaReviewedTargets(
  records: SolaResolverImportRecord[],
  reviewStates: Awaited<ReturnType<typeof readSolaReviewStates>>,
): SolaReviewedTargetExport[] {
  const matched = records
    .map((record) => {
      const review = reviewStates[record.candidateKey];
      if (!review || !isExportableReviewStatus(review.reviewStatus)) return null;
      return {
        reviewStatus: review.reviewStatus,
        record,
        notes: review.notes,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort(compareTargets);

  return matched.map((row, index) =>
    toExportRow(index + 1, row.reviewStatus, row.record, row.notes),
  );
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function joinList(values: string[]): string {
  return values.join("; ");
}

const CSV_HEADERS: Array<keyof SolaReviewedTargetExport> = [
  "rank",
  "reviewStatus",
  "candidateKey",
  "operatorName",
  "displayName",
  "professionalName",
  "businessName",
  "locationSlug",
  "locationName",
  "suiteNumber",
  "phones",
  "bookingLinks",
  "website",
  "socialLinks",
  "categoryBuckets",
  "acquisitionScore",
  "contactabilityScore",
  "notes",
  "profileUrl",
];

function targetToCsvRow(target: SolaReviewedTargetExport): string {
  return CSV_HEADERS.map((key) => {
    const value = target[key];
    if (value === undefined || value === null) return "";
    if (Array.isArray(value)) return csvEscape(joinList(value.map(String)));
    return csvEscape(String(value));
  }).join(",");
}

export function buildSolaReviewedTargetsCsv(targets: SolaReviewedTargetExport[]): string {
  const lines = [CSV_HEADERS.join(","), ...targets.map(targetToCsvRow)];
  return `${lines.join("\n")}\n`;
}

export async function exportSolaReviewedTargets(): Promise<SolaReviewedTargetsArtifact> {
  const importArtifact = await readSolaResolverImport();
  if (!importArtifact) {
    throw new Error("Missing sola-resolver-import.generated.json — run npm run build:sola:resolver");
  }

  const reviewStates = await readSolaReviewStates();
  const targets = buildSolaReviewedTargets(importArtifact.records, reviewStates);

  const artifact: SolaReviewedTargetsArtifact = {
    generatedAt: new Date().toISOString(),
    exportedCount: targets.length,
    targets,
  };

  await mkdir(path.dirname(SOLA_REVIEWED_TARGETS_JSON_PATH), { recursive: true });
  await writeFile(
    SOLA_REVIEWED_TARGETS_JSON_PATH,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    SOLA_REVIEWED_TARGETS_CSV_PATH,
    buildSolaReviewedTargetsCsv(targets),
    "utf8",
  );

  return artifact;
}
