export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActiveBookPointer } from "@/lib/vmb/active-book-pointer";
import {
  isAdminDemoBookConfigured,
  isBoundToAdminDemoBook,
  resolveAdminDemoBookConfig,
} from "@/lib/vmb/admin-demo-book";
import {
  isVmbDevOperatorApiEnabled,
  vmbDevOperatorApiDisabledResponse,
} from "@/lib/vmb/dev-operator-api-guard";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";

export async function GET(req: NextRequest) {
  if (!isVmbDevOperatorApiEnabled()) {
    return NextResponse.json(vmbDevOperatorApiDisabledResponse(), { status: 404 });
  }

  const config = resolveAdminDemoBookConfig();
  const salonId = getVmbTrialIdFromRequest(req);
  const pointer = salonId ? await getActiveBookPointer(salonId) : undefined;
  const workspace = salonId ? await getWorkspaceForTrial(salonId) : undefined;
  const boundAnalysisId = pointer?.analysisId ?? workspace?.latestAnalysisId;

  return NextResponse.json({
    ok: true,
    data: {
      configured: isAdminDemoBookConfigured(),
      analysisId: config?.analysisId,
      restrictToSalonId: config?.restrictToSalonId,
      currentSalonId: salonId,
      usingDemoBook: isBoundToAdminDemoBook(boundAnalysisId),
    },
  });
}
