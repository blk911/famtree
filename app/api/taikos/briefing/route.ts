import { NextRequest, NextResponse } from "next/server";
import { generateAiosResponse } from "@/lib/taikos/adapters";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { buildMorningBriefing } from "@/lib/taikos/orchestrator/morning-briefing";
import { markBriefingShown } from "@/lib/taikos/session/session-manager";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const pathname = req.nextUrl.searchParams.get("pathname")?.trim() || "/vmb/dashboard";
  const analysisId = req.nextUrl.searchParams.get("analysisId")?.trim();
  const mode = req.nextUrl.searchParams.get("mode")?.trim() as
    | "briefing"
    | "page-assistant"
    | "question"
    | "idle-summary"
    | undefined;
  const question = req.nextUrl.searchParams.get("question")?.trim();

  try {
    const context = await buildAiosContextPacket({
      trialId,
      pathname,
      searchParams: req.nextUrl.searchParams,
      analysisId,
      aiosOpen: true,
      recordLogin: false,
    });

    if (!context) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }

    const panelMode = mode ?? "briefing";
    const response = await generateAiosResponse({
      context,
      mode: panelMode,
      question,
    });

    const briefing = buildMorningBriefing(context);
    if (panelMode === "briefing" && briefing.variant !== "skip") {
      await markBriefingShown(context.salonId, context.operatorId);
    }

    return NextResponse.json({
      ok: true,
      data: {
        context,
        briefing,
        response,
      },
    });
  } catch (err) {
    console.error("[taikos:briefing]", err);
    return NextResponse.json({ ok: false, error: "Failed to build briefing" }, { status: 500 });
  }
}
