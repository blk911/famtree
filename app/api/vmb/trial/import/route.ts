export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { analyzeSalonBackOfficeUpload } from "@/lib/intelligence/salon/backoffice/analyze-import";
import { getVmbTrialLead } from "@/lib/vmb/trial-store";
import { appendTrialImportRun } from "@/lib/vmb/trial-import-store";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const trialId = (form.get("trialId")?.toString() ?? "").trim();
    const providerRaw = (form.get("provider")?.toString() ?? "").trim().toLowerCase();
    const entityRaw = (form.get("entity")?.toString() ?? "").trim().toLowerCase();

    if (!trialId) {
      return NextResponse.json({ ok: false, error: "trialId is required" }, { status: 400 });
    }

    const trial = await getVmbTrialLead(trialId);
    if (!trial) {
      return NextResponse.json({ ok: false, error: "Trial not found" }, { status: 404 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
    }

    const fileName = file.name || "upload.csv";
    const buffer = Buffer.from(await file.arrayBuffer());

    const analyzed = await analyzeSalonBackOfficeUpload({
      buffer,
      fileName,
      providerRaw,
      entityRaw,
    });

    if (!analyzed.ok) {
      return NextResponse.json({ ok: false, error: analyzed.error, detail: analyzed.detail });
    }

    const persistError = await appendTrialImportRun(trialId, analyzed.run);
    if (persistError) {
      return NextResponse.json({
        ok: false,
        error: `Import run save failed: ${persistError}`,
      });
    }

    return NextResponse.json({ ok: true, run: analyzed.run });
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
