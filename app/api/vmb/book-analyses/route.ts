export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listBookAnalysisCatalog } from "@/lib/vmb/book-analysis/list-book-analysis-catalog";
import {
  isVmbDevOperatorApiEnabled,
  vmbDevOperatorApiDisabledResponse,
} from "@/lib/vmb/dev-operator-api-guard";
import { getVmbTrialIdFromRequest } from "@/lib/vmb/trial-cookie";

export async function GET(req: NextRequest) {
  if (!isVmbDevOperatorApiEnabled()) {
    return NextResponse.json(vmbDevOperatorApiDisabledResponse(), { status: 404 });
  }

  const currentSalonId = getVmbTrialIdFromRequest(req);
  const catalog = await listBookAnalysisCatalog(currentSalonId);

  return NextResponse.json({ ok: true, data: catalog });
}
