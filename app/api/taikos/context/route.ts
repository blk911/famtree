import { NextRequest, NextResponse } from "next/server";
import { buildAiosContextPacket } from "@/lib/taikos/context/context-builder";
import { resolveBookLoadedState } from "@/lib/vmb/book-status";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const pathname = req.nextUrl.searchParams.get("pathname")?.trim() || "/vmb/dashboard";
  const analysisId = req.nextUrl.searchParams.get("analysisId")?.trim();
  const aiosOpen = req.nextUrl.searchParams.get("aiosOpen") === "1";
  const recordLogin = req.nextUrl.searchParams.get("recordLogin") !== "0";

  try {
    const data = await buildAiosContextPacket({
      trialId,
      pathname,
      searchParams: req.nextUrl.searchParams,
      analysisId,
      aiosOpen,
      recordLogin,
    });

    if (!data) {
      return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
    }

    if (process.env.NODE_ENV === "development") {
      const bookLoadedResolved = resolveBookLoadedState({
        hasRealBookData: data.hasRealBookData,
        clientSummary: data.clientSummary,
        codaSummary: data.codaSummary,
        analysisId: data.analysisId,
        recordCount: data.recordCount,
      });
      console.log("[taikos:context:debug]", {
        pathname,
        salonId: data.salonId,
        analysisId: data.analysisId,
        hasRealBookData: data.hasRealBookData,
        totalClients: data.clientSummary.totalClients,
        importedClientCount: data.codaSummary.context.importedClientCount,
        recordCount: data.recordCount,
        bookLoadedResolved,
      });
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[taikos:context]", err);
    return NextResponse.json({ ok: false, error: "Failed to build context" }, { status: 500 });
  }
}
