export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { analyzeVmbBook } from "@/lib/vmb/book-analysis/analyze-book";
import {
  getLatestVmbBookAnalysis,
  getVmbBookAnalysis,
  saveVmbBookAnalysis,
} from "@/lib/vmb/book-analysis/analysis-store";
import { saveVmbBookUpload } from "@/lib/vmb/book-upload-store";
import { parseBookUpload } from "@/lib/vmb/provider-ingest/parse-book-upload";
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
  const id = req.nextUrl.searchParams.get("id")?.trim();
  const analysis = id ? await getVmbBookAnalysis(id) : await getLatestVmbBookAnalysis();
  if (!analysis) {
    return NextResponse.json({ ok: false, error: "No analysis found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: analysis });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const trialId = String(body.trialId ?? "").trim() || undefined;
    const salonName = String(body.salonName ?? "").trim() || undefined;
    const providerPlatform = normalizePlatform(body.providerPlatform);
    const inputText = String(body.inputText ?? "").trim();

    if (!inputText) {
      return NextResponse.json({ ok: false, error: "inputText is required" }, { status: 400 });
    }

    const parsed = parseBookUpload(inputText);
    if (parsed.records.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "No client records parsed",
        data: { warnings: parsed.warnings },
      });
    }

    await saveVmbBookUpload({
      trialId,
      salonName,
      providerPlatform,
      recordCount: parsed.records.length,
      parseWarnings: parsed.warnings,
    });

    const result = analyzeVmbBook({
      trialId,
      salonName,
      providerPlatform,
      records: parsed.records,
    });

    const saved = await saveVmbBookAnalysis(result);
    if ("error" in saved) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        analysis: saved.saved,
        warnings: parsed.warnings,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
