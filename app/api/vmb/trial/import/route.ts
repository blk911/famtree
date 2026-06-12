export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { analyzeSalonBackOfficeUpload } from "@/lib/intelligence/salon/backoffice/analyze-import";
import { bridgeGgenImportToVmbAnalysis } from "@/lib/vmb/ggen-conversion-bridge";
import { logVmbFlow } from "@/lib/vmb/flow-log";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";
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

    const bridge = await bridgeGgenImportToVmbAnalysis({
      trialId,
      salonName: trial.salonName,
      providerPlatform: trial.providerPlatform,
      importRun: analyzed.run,
    });

    if (!bridge.ok) {
      logVmbFlow("ggen converted", {
        trialId,
        salonId: trialId,
        workspaceId: trialId,
        bridgeFailed: true,
        reason: bridge.reason,
        sourceUploadId: analyzed.run.id,
      });
    }

    const res = NextResponse.json({
      ok: true,
      run: analyzed.run,
      bridge: bridge.ok
        ? {
            analysisId: bridge.analysisId,
            recordCount: bridge.recordCount,
            clientCount: bridge.clientCount,
          }
        : { error: bridge.reason },
    });
    res.cookies.set(VMB_TRIAL_COOKIE, trialId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 45,
    });
    return res;
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
