import { NextRequest, NextResponse } from "next/server";
import {
  getSessionSnapshot,
  recordAiosInteraction,
  recordPageView,
} from "@/lib/taikos/session/session-manager";
import { getWorkspaceForTrial } from "@/lib/vmb/workspace-store";
import { VMB_TRIAL_COOKIE } from "@/lib/vmb/paths";

function operatorId(ownerName?: string, email?: string): string {
  return (email?.trim() || ownerName?.trim() || "operator").toLowerCase();
}

export async function GET(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const workspace = await getWorkspaceForTrial(trialId);
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
  }

  const aiosOpen = req.nextUrl.searchParams.get("aiosOpen") === "1";
  const snapshot = await getSessionSnapshot(
    trialId,
    operatorId(workspace.ownerName, workspace.email),
    aiosOpen,
  );

  return NextResponse.json({ ok: true, data: snapshot });
}

export async function PATCH(req: NextRequest) {
  const trialId = req.cookies.get(VMB_TRIAL_COOKIE)?.value?.trim();
  if (!trialId) {
    return NextResponse.json({ ok: false, error: "No salon session" }, { status: 401 });
  }

  const workspace = await getWorkspaceForTrial(trialId);
  if (!workspace) {
    return NextResponse.json({ ok: false, error: "Workspace not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    pathname?: string;
    interaction?: boolean;
  };

  const opId = operatorId(workspace.ownerName, workspace.email);

  if (body.pathname) {
    const snapshot = await recordPageView(trialId, opId, body.pathname);
    return NextResponse.json({ ok: true, data: snapshot });
  }

  if (body.interaction) {
    const snapshot = await recordAiosInteraction(trialId, opId);
    return NextResponse.json({ ok: true, data: snapshot });
  }

  return NextResponse.json({ ok: false, error: "No patch fields" }, { status: 400 });
}
