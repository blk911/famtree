// app/api/admin/intelligence/salon/backoffice/import/route.ts
// POST multipart: analyze owner-approved salon export
// GET: import run history

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { parseSalonBackOfficeFile } from "@/lib/intelligence/salon/backoffice/file-parser";
import { detectSalonBackOfficeSchema } from "@/lib/intelligence/salon/backoffice/schema-detector";
import { parseGlossGeniusRows } from "@/lib/intelligence/salon/backoffice/providers/glossgenius-parser";
import {
  buildHiddenMoneyReport,
  generateImportRunId,
} from "@/lib/intelligence/salon/backoffice/hidden-money-report";
import {
  appendSalonBackOfficeImportRun,
  readSalonBackOfficeImportRuns,
} from "@/lib/intelligence/salon/backoffice/import-store";
import type {
  SalonBackOfficeEntity,
  SalonBackOfficeProvider,
  SalonBackOfficeImportRun,
} from "@/lib/intelligence/salon/backoffice/types";

function isProvider(value: string): value is SalonBackOfficeProvider {
  return ["glossgenius", "vagaro", "square", "fresha", "booksy", "unknown"].includes(value);
}

function isEntity(value: string): value is SalonBackOfficeEntity {
  return [
    "clients", "appointments", "payments", "services", "products",
    "memberships", "staff", "notes", "reviews", "unknown",
  ].includes(value);
}

export async function GET() {
  const runs = await readSalonBackOfficeImportRuns();
  return NextResponse.json({ ok: true, runs });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const providerRaw = (form.get("provider")?.toString() ?? "").trim().toLowerCase();
    const entityRaw = (form.get("entity")?.toString() ?? "").trim().toLowerCase();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
    }

    const fileName = file.name || "upload.csv";
    const buffer = Buffer.from(await file.arrayBuffer());

    const parsed = await parseSalonBackOfficeFile(buffer, fileName);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error });
    }

    const { headers, rows } = parsed.data;
    let detection = detectSalonBackOfficeSchema(headers, rows);

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

    const useGloss =
      detection.provider === "glossgenius" ||
      providerRaw === "glossgenius";

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
      fileName,
      rowCount: rows.length,
      mappedCount,
      unmappedHeaders: detection.unmappedHeaders,
      schemaConfidence: detection.schemaConfidence,
      normalizedPreview,
      report,
      createdAt: new Date().toISOString(),
    };

    const persistError = await appendSalonBackOfficeImportRun(run);
    if (persistError) {
      return NextResponse.json({
        ok: false,
        error: `Import run save failed: ${persistError}`,
        debug: { runId, detection },
      });
    }

    return NextResponse.json({
      ok: true,
      run,
      detection,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Import analysis failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
