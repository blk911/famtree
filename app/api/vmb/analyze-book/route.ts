export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getLatestVmbBookAnalysisForTrial,
  getVmbBookAnalysisForTrial,
} from "@/lib/vmb/book-analysis/analysis-store";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { decodeBookUploadFile } from "@/lib/vmb/provider-ingest/parse-book-upload";
import { runVmbBookAnalysis } from "@/lib/vmb/run-book-analysis";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

const PLATFORMS: VmbProviderPlatform[] = [
  "glossgenius",
  "vagaro",
  "square",
  "fresha",
  "sola",
  "other",
];

function normalizePlatform(raw: unknown): VmbProviderPlatform | undefined {
  const v = String(raw ?? "").trim().toLowerCase();
  if (PLATFORMS.includes(v as VmbProviderPlatform)) return v as VmbProviderPlatform;
  return undefined;
}

export async function GET(req: NextRequest) {
  const trialId = getVmbTrialIdFromRequest(req);
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session", data: null }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim();
  const analysis = id
    ? await getVmbBookAnalysisForTrial(id, trialId)
    : await getLatestVmbBookAnalysisForTrial(trialId);

  if (id && !analysis) {
    return NextResponse.json(
      { ok: false, error: "Analysis not available for this trial", data: null },
      { status: 403 },
    );
  }

  if (!analysis) {
    return NextResponse.json({ ok: true, data: null });
  }

  return NextResponse.json({ ok: true, data: analysis });
}

async function extractAnalyzeInput(req: NextRequest): Promise<
  | {
      trialId?: string;
      salonName?: string;
      providerPlatform?: VmbProviderPlatform;
      rawText: string;
      sourceType: "paste" | "csv_upload" | "sample";
      fileName?: string;
    }
  | { error: string }
> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const trialId = String(form.get("trialId") ?? "").trim() || undefined;
    const salonName = String(form.get("salonName") ?? "").trim() || undefined;
    const providerPlatform = normalizePlatform(form.get("providerPlatform"));
    const inputText = String(form.get("inputText") ?? "").trim();

    if (file && file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const decoded = decodeBookUploadFile(buffer, file.name || "upload.csv");
      if ("error" in decoded) return { error: decoded.error };
      return {
        trialId,
        salonName,
        providerPlatform,
        rawText: decoded.text,
        sourceType: "csv_upload",
        fileName: file.name,
      };
    }

    if (inputText) {
      return {
        trialId,
        salonName,
        providerPlatform,
        rawText: inputText,
        sourceType: "paste",
      };
    }

    return { error: "file or inputText is required" };
  }

  const body = (await req.json()) as Record<string, unknown>;
  const trialId = String(body.trialId ?? "").trim() || undefined;
  const salonName = String(body.salonName ?? "").trim() || undefined;
  const providerPlatform = normalizePlatform(body.providerPlatform);
  const inputText = String(body.inputText ?? body.rawText ?? "").trim();
  const fileBase64 = String(body.fileBase64 ?? "").trim();
  const fileName = String(body.fileName ?? "upload.csv").trim();

  if (fileBase64) {
    const buffer = Buffer.from(fileBase64, "base64");
    const decoded = decodeBookUploadFile(buffer, fileName);
    if ("error" in decoded) return { error: decoded.error };
    return {
      trialId,
      salonName,
      providerPlatform,
      rawText: decoded.text,
      sourceType: "csv_upload",
      fileName,
    };
  }

  if (!inputText) {
    return { error: "inputText, file upload, or fileBase64 is required" };
  }

  return {
    trialId,
    salonName,
    providerPlatform,
    rawText: inputText,
    sourceType: body.sourceType === "sample" ? "sample" : "paste",
    fileName: body.fileName ? fileName : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const trialId = getVmbTrialIdFromRequest(req);
    if (!trialId) {
      return NextResponse.json({ ok: false, error: "Trial session required" }, { status: 401 });
    }

    const extracted = await extractAnalyzeInput(req);
    if ("error" in extracted) {
      return NextResponse.json({ ok: false, error: extracted.error }, { status: 400 });
    }

    if (extracted.trialId && extracted.trialId !== trialId) {
      return NextResponse.json(
        { ok: false, error: "trialId does not match current trial session" },
        { status: 403 },
      );
    }

    const outcome = await runVmbBookAnalysis({
      ...extracted,
      trialId,
    });
    if (!outcome.ok) {
      return NextResponse.json({
        ok: false,
        error: outcome.error,
        data: outcome.parse
          ? {
              parse: {
                parsedRecordCount: outcome.parse.parsedRecordCount,
                skippedRows: outcome.parse.skippedRows,
                warnings: outcome.parse.warnings,
                detectedColumns: outcome.parse.detectedColumns,
                providerMode: outcome.parse.providerMode,
              },
            }
          : undefined,
      });
    }

    const { analysis, parse } = outcome.data;
    return NextResponse.json({
      ok: true,
      data: {
        analysis,
        parse: {
          parsedRecordCount: parse.parsedRecordCount,
          skippedRows: parse.skippedRows,
          warnings: parse.warnings,
          detectedColumns: parse.detectedColumns,
          providerMode: parse.providerMode,
        },
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
