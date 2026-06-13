export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { analyzeSalonBackOfficeUpload } from "@/lib/intelligence/salon/backoffice/analyze-import";
import { resolveActiveBook } from "@/lib/vmb/active-book-resolver";
import { getVmbBookAnalysis, getVmbBookAnalysisForTrial } from "@/lib/vmb/book-analysis/analysis-store";
import { bridgeGgenImportToVmbAnalysis } from "@/lib/vmb/ggen-conversion-bridge";
import { resolveTrialIdFromRequest } from "@/lib/vmb/resolve-trial-from-request";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { applyVmbTrialCookie } from "@/lib/vmb/trial-cookie-options";
import { appendTrialImportRun } from "@/lib/vmb/trial-import-store";
import {
  getWorkspaceForTrial,
  setLatestAnalysis,
  upsertWorkspaceForTrial,
} from "@/lib/vmb/workspace-store";
import { decodeBookUploadFile } from "@/lib/vmb/provider-ingest/parse-book-upload";
import { runVmbBookAnalysis } from "@/lib/vmb/run-book-analysis";
import { VMB_PROVIDER_PLATFORMS } from "@/lib/vmb/provider-guide";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { VmbProviderPlatform } from "@/types/vmb/trial";

function normalizePlatform(raw: unknown): VmbProviderPlatform | undefined {
  const v = String(raw ?? "").trim().toLowerCase();
  if (VMB_PROVIDER_PLATFORMS.includes(v as VmbProviderPlatform)) return v as VmbProviderPlatform;
  return undefined;
}

export async function GET(req: NextRequest) {
  const trialResolution = await resolveTrialIdFromRequest(req);
  const trialId = trialResolution.trialId;
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No trial session", data: null }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id")?.trim();
  const resolved = await resolveActiveBook(trialId, { queryId: id });
  const analysis = resolved.analysis;

  if (id && !analysis) {
    return NextResponse.json(
      { ok: false, error: "Analysis not available for this trial", data: null },
      { status: 403 },
    );
  }

  if (!analysis) {
    return NextResponse.json({ ok: true, data: null });
  }

  const res = NextResponse.json({ ok: true, data: analysis });
  if (!getVmbTrialIdFromRequest(req) && trialId) {
    applyVmbTrialCookie(res, trialId);
  }
  return res;
}

async function extractAnalyzeInput(req: NextRequest): Promise<
  | {
      trialId?: string;
      salonName?: string;
      providerPlatform?: VmbProviderPlatform;
      rawText: string;
      sourceType: "paste" | "csv_upload" | "sample";
      fileName?: string;
      fileBuffer?: Buffer;
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
        fileBuffer: buffer,
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
      fileBuffer: buffer,
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

async function tryGgenBridgeFallback(input: {
  trialId: string;
  salonName?: string;
  providerPlatform?: VmbProviderPlatform;
  fileBuffer: Buffer;
  fileName: string;
}): Promise<
  | { ok: true; analysis: VmbBookAnalysisResult; parsedRecordCount: number }
  | { ok: false; reason: string }
> {
  if (input.providerPlatform !== "glossgenius") {
    return { ok: false, reason: "GGEN fallback only applies to glossgenius uploads" };
  }

  const analyzed = await analyzeSalonBackOfficeUpload({
    buffer: input.fileBuffer,
    fileName: input.fileName,
    providerRaw: "glossgenius",
  });
  if (!analyzed.ok) {
    return { ok: false, reason: analyzed.error };
  }

  await appendTrialImportRun(input.trialId, analyzed.run);

  const bridge = await bridgeGgenImportToVmbAnalysis({
    trialId: input.trialId,
    salonName: input.salonName,
    providerPlatform: input.providerPlatform,
    importRun: analyzed.run,
  });
  if (!bridge.ok) {
    return { ok: false, reason: bridge.reason };
  }

  const analysis =
    (await getVmbBookAnalysisForTrial(bridge.analysisId, input.trialId)) ??
    (await getVmbBookAnalysis(bridge.analysisId));
  if (!analysis) {
    return { ok: false, reason: "GGEN bridge succeeded but analysis not found in store" };
  }

  return { ok: true, analysis, parsedRecordCount: bridge.recordCount };
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
      const zeroRecords =
        outcome.parse?.parsedRecordCount === 0 ||
        outcome.error.toLowerCase().includes("no client records");
      if (zeroRecords && extracted.fileBuffer && extracted.fileName) {
        const ggen = await tryGgenBridgeFallback({
          trialId,
          salonName: extracted.salonName,
          providerPlatform: extracted.providerPlatform,
          fileBuffer: extracted.fileBuffer,
          fileName: extracted.fileName,
        });
        if (ggen.ok) {
          await upsertWorkspaceForTrial({
            trialId,
            salonName: extracted.salonName ?? ggen.analysis.salonName ?? "Your Salon",
            providerPlatform: extracted.providerPlatform ?? ggen.analysis.providerPlatform,
          });
          const workspaceUpdate = await setLatestAnalysis(trialId, ggen.analysis.analysisId);
          if ("error" in workspaceUpdate) {
            return NextResponse.json({ ok: false, error: workspaceUpdate.error }, { status: 500 });
          }
          const res = NextResponse.json({
            ok: true,
            data: {
              analysis: ggen.analysis,
              parse: {
                parsedRecordCount: ggen.parsedRecordCount,
                skippedRows: 0,
                warnings: [`ggen-fallback:${extracted.fileName}`],
                detectedColumns: ["ggen-normalized"],
                providerMode: "glossgenius",
              },
            },
          });
          applyVmbTrialCookie(res, trialId);
          return res;
        }
      }

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

    await upsertWorkspaceForTrial({
      trialId,
      salonName: extracted.salonName ?? analysis.salonName ?? "Your Salon",
      providerPlatform: extracted.providerPlatform ?? analysis.providerPlatform,
    });
    const workspaceUpdate = await setLatestAnalysis(trialId, analysis.analysisId);
    if ("error" in workspaceUpdate) {
      return NextResponse.json({ ok: false, error: workspaceUpdate.error }, { status: 500 });
    }

    const res = NextResponse.json({
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
    applyVmbTrialCookie(res, trialId);
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
