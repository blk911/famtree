import { parseSalonBackOfficeFile } from "./file-parser";
import { detectSalonBackOfficeSchema } from "./schema-detector";
import { parseGlossGeniusRows } from "./providers/glossgenius-parser";
import { buildHiddenMoneyReport, generateImportRunId } from "./hidden-money-report";
import type {
  SalonBackOfficeEntity,
  SalonBackOfficeImportRun,
  SalonBackOfficeProvider,
} from "./types";

function isProvider(value: string): value is SalonBackOfficeProvider {
  return ["glossgenius", "vagaro", "square", "fresha", "booksy", "unknown"].includes(value);
}

function isEntity(value: string): value is SalonBackOfficeEntity {
  return [
    "clients",
    "appointments",
    "payments",
    "services",
    "products",
    "memberships",
    "staff",
    "notes",
    "reviews",
    "unknown",
  ].includes(value);
}

export type AnalyzeSalonImportInput = {
  buffer: Buffer;
  fileName: string;
  providerRaw?: string;
  entityRaw?: string;
};

export async function analyzeSalonBackOfficeUpload(
  input: AnalyzeSalonImportInput,
): Promise<
  | { ok: true; run: SalonBackOfficeImportRun }
  | { ok: false; error: string; detail?: string }
> {
  const parsed = await parseSalonBackOfficeFile(input.buffer, input.fileName);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const { headers, rows } = parsed.data;
  let detection = detectSalonBackOfficeSchema(headers, rows);

  const providerRaw = (input.providerRaw ?? "").trim().toLowerCase();
  const entityRaw = (input.entityRaw ?? "").trim().toLowerCase();

  if (providerRaw && isProvider(providerRaw) && providerRaw !== "unknown") {
    detection = { ...detection, provider: providerRaw };
  }

  const entityOverride =
    entityRaw && entityRaw !== "auto" && isEntity(entityRaw) && entityRaw !== "unknown"
      ? entityRaw
      : undefined;

  if (entityOverride) {
    detection = { ...detection, entity: entityOverride };
  }

  let normalizedPreview: SalonBackOfficeImportRun["normalizedPreview"] = [];
  let mappedCount = 0;

  const useGloss = detection.provider === "glossgenius" || providerRaw === "glossgenius";

  if (useGloss) {
    const parsedRows = parseGlossGeniusRows(rows, detection, entityOverride);
    normalizedPreview = parsedRows.records;
    mappedCount = parsedRows.mappedCount;
  }

  const runId = generateImportRunId();
  const report = buildHiddenMoneyReport(runId, normalizedPreview);

  const run: SalonBackOfficeImportRun = {
    id: runId,
    provider: detection.provider,
    entity: entityOverride ?? detection.entity,
    fileName: input.fileName,
    rowCount: rows.length,
    mappedCount,
    unmappedHeaders: detection.unmappedHeaders,
    schemaConfidence: detection.schemaConfidence,
    normalizedPreview,
    report,
    createdAt: new Date().toISOString(),
  };

  return { ok: true, run };
}
